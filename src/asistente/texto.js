// ─── QUITARLE LAS MARCAS AL TEXTO ─────────────────────────────────────────────
// Los modelos escriben en markdown por costumbre: **negritas**, listas con guión,
// `código`. En un editor eso se ve bonito; en una burbuja de chat que no lo interpreta
// se ven los asteriscos tal cual y parece que ha contestado una máquina rota.
//
// Se le pide en el sistema que no los use, pero pedirlo no basta: un modelo se olvida
// cada tantas respuestas, y el que se olvida no avisa. Así que además se limpia aquí,
// que es el único sitio donde se puede garantizar.
//
// Lo de la voz ya hacía esto mismo, así que aquí vive una vez y allí se reusa. La
// diferencia entre las dos: leyendo en alto los saltos de línea sobran, y leyendo en
// pantalla son justo lo que hace que una lista se entienda.

// Los guiones de lista pasan a "·" en vez de desaparecer: sin nada delante, tres cosas
// seguidas se leen como una parrafada; con el punto se siguen viendo como tres.
export function sinMarcas(texto) {
  return String(texto || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[-*•]\s+/gm, "· ")
    // Tres o más saltos seguidos son un hueco raro en la burbuja, no una separación.
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
