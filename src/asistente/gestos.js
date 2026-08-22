// ─── LO QUE ESTÁ HACIENDO, EN LA CARA ─────────────────────────────────────────
// El asistente ya dice qué herramienta está usando —sale como etiqueta debajo de la
// respuesta—, pero eso se lee DESPUÉS. Mientras trabaja solo había un "pensando…" para
// todo, lo mismo si estaba buscando un evento que si estaba a punto de borrar algo.
//
// Aquí cada herramienta se traduce a un gesto y a una frase. No es adorno: buscar y
// borrar no son lo mismo, y verlo en la cara mientras pasa es la diferencia entre
// enterarte a tiempo y enterarte cuando ya está hecho.
//
// Sin React: entra el nombre de una herramienta, sale qué cara poner.

// El orden importa: gana el primero que casa, así que lo específico va antes que lo
// general ("borrar" antes que cualquier cosa con "apunte" dentro).
const REGLAS = [
  { como: /^(borrar|olvidar|eliminar)/, gesto: "borrando", frase: "Borrando" },
  { como: /^apuntar/, gesto: "creando", frase: "Apuntando" },
  // Marcar una tarea escribe, no mira. Sin esta regla caía en el "Mirando" de por
  // defecto, que es justo lo contrario de lo que está pasando.
  { como: /^marcar/, gesto: "creando", frase: "Marcando" },
  { como: /^(crear|agregar|anadir|añadir)/, gesto: "creando", frase: "Creando" },
  { como: /^(editar|cambiar|corregir|modificar)/, gesto: "creando", frase: "Corrigiendo" },
  { como: /^recordar/, gesto: "aprendiendo", frase: "Aprendiendo" },
  { como: /^(revisar|que_falta)/, gesto: "revisando", frase: "Repasando" },
  { como: /^buscar/, gesto: "buscando", frase: "Buscando" },
  // Mirar y buscar no es lo mismo: buscar es no saber dónde está, mirar es abrirlo.
  { como: /^(ver_|simular)/, gesto: "buscando", frase: "Mirando" },
  { como: /^calcular/, gesto: "calculando", frase: "Calculando" },
  { como: /^mensaje/, gesto: "creando", frase: "Escribiendo el mensaje" },
];

// Cómo se llama cada herramienta en cristiano, para la frase. Sin esto sale
// "buscando ver_checklist", que es peor que no decir nada.
const EN_CRISTIANO = {
  buscar_eventos: "tus eventos",
  ver_evento: "el evento",
  ver_checklist: "la checklist",
  ver_escaleta: "la escaleta",
  ver_calendario: "el calendario",
  ver_cerebro: "lo que sé",
  que_falta: "lo que falta",
  revisar_evento: "el evento",
  revisar_todo: "todos los eventos",
  calcular_bebida: "la bebida",
  calcular_hielo: "el hielo",
  calcular_personal: "la gente",
  simular_checklist: "una checklist de prueba",
  crear_checklists: "las checklists",
  ver_tareas: "las tareas",
  ver_repaso: "el repaso de la noche",
  apuntar_tarea: "la tarea",
  marcar_tarea: "la tarea",
  crear_apunte: "el apunte",
  editar_apunte: "el apunte",
  borrar_apunte: "el apunte",
  recordar: "lo que me has contado",
  olvidar: "lo que me dijiste",
  mensaje_para_el_equipo: "para el equipo",
  buscar_correos: "en el correo",
};

export function gestoDeHerramienta(nombre) {
  const n = String(nombre || "").trim();
  if (!n) return { gesto: "pensando", frase: "Pensando…" };
  // Cuando el aviso no es una herramienta sino un proveedor ("preguntando a claude"),
  // se deja pasar tal cual: ya viene escrito para leerse.
  if (n.includes(" ")) return { gesto: "pensando", frase: `${n[0].toUpperCase()}${n.slice(1)}…` };

  const regla = REGLAS.find(r => r.como.test(n));
  const que = EN_CRISTIANO[n] || n.replace(/_/g, " ");
  return regla
    ? { gesto: regla.gesto, frase: `${regla.frase} ${que}…` }
    : { gesto: "pensando", frase: `Mirando ${que}…` };
}
