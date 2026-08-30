// ─── LO QUE EL ASISTENTE PUEDE MIRAR ──────────────────────────────────────────
// El contexto es lo ÚNICO que existe para el asistente: lo que no esté aquí, no lo
// puede consultar por mucho que se lo pidan. Por eso se arma en un solo sitio y no en
// cada app — si cada una lo montara a su manera, el asistente sabría cosas distintas
// según por dónde se abriera, y nadie sabría cuáles.
//
// Cada app pasa lo que tiene a mano. Lo que no tenga se queda fuera y las herramientas
// que dependan de ello contestarán que no hay datos, que es la verdad.

// Los apuntes se recortan a lo que hace falta. Un apunte del calendario lleva dentro
// cosas que no pintan nada en una respuesta (marcas internas, ids de enlace) y que solo
// servirían para gastar tokens.
const recortaApunte = (a) => ({
  id: a.id || "",
  fecha: a.fecha || "",
  hasta: a.hasta || "",
  titulo: a.titulo || "",
  tipo: a.tipo || "",
  sitio: a.sitio || "",
  hora: a.hora || "",
  pax: a.pax || 0,
  evento: a.evento || "",
});

export function contextoDelAsistente({
  eventosGuardados = {},
  apuntes = [],
  eventoActual = null,
  memoria = [],
  objetivos = [],
  tareas = [],
  estrategia = null,
  conectores = {},
  equipo = [],
  respuestasFormulario = null,
  progresoCarga = null,
  oportunidades = null,
  onRecordar,
  onOlvidar,
  onUsoMemoria,
  onEscribir,
  onPonerObjetivo,
  onCambiarEstadoObjetivo,
  onQuitarObjetivo,
  onMarcarTarea,
  onQuitarTarea,
  nivel,
  avisoActualizacion = null,
} = {}) {
  return {
    eventosGuardados,
    apuntes: (Array.isArray(apuntes) ? apuntes : []).filter(Boolean).map(recortaApunte),
    eventoActual,
    memoria,
    objetivos,
    tareas,
    estrategia,
    conectores,
    equipo,
    respuestasFormulario,
    // Cuánto lleva cargado del evento abierto AHORA MISMO — los mismos números que ya
    // se ven en la ficha del Resumen (totalConceptos/itemsCargados/itemsPreparados en
    // App.jsx), no un recuento aparte: uno nuevo, calculado desde los datos guardados y
    // no desde lo que hay de verdad en pantalla, podría no coincidir si alguien ha
    // renombrado categorías o items a mano (eso vive en este navegador, no se guarda en
    // el evento). null en apps sin Modo carga, como el calendario.
    progresoCarga,
    onRecordar,
    onOlvidar,
    onUsoMemoria,
    // Por dónde escribe cuando tenga permiso. Cada app pone la suya: la checklist sabe
    // guardar eventos, el calendario sabe guardar apuntes. El asistente no sabe de
    // ninguna de las dos, solo llama a esto.
    onEscribir,
    // Los objetivos los edita la pantalla del cerebro; el asistente solo los lee.
    onPonerObjetivo,
    onCambiarEstadoObjetivo,
    onQuitarObjetivo,
    // Las tareas las toca la pantalla directamente; el asistente pasa por onEscribir.
    onMarcarTarea,
    onQuitarTarea,
    nivel,
    // { cambios, aplicada } o null — ver actualizacion.js. Sin recorte: no lleva nada
    // sensible, son las mismas frases que ya se ven en el banner de arriba.
    avisoActualizacion,
    // La auditoría de negocio, ya calculada (ver App.jsx). null en apps que no la
    // calculan — y la herramienta lo dice, que no hay nada peor que un "todo en
    // orden" contado desde una pantalla que no tiene los datos.
    oportunidades,
  };
}

// El estado del evento que está abierto, tal como lo quiere el asistente. Se elige a
// mano y no se manda el objeto entero: dentro hay marcas de carga y notas internas que
// no pintan nada en una respuesta.
export function eventoAbierto(estado = {}) {
  if (!estado || !estado.evento) return null;
  return {
    nombreEvento: estado.nombreEvento || "",
    evento: estado.evento,
    pax: estado.pax || 0,
    ninos: estado.ninos || 0,
    fechaEvento: estado.fechaEvento || "",
    horaInicio: estado.horaInicio || "",
    ubicacion: estado.ubicacion || "",
    notasEvento: estado.notasEvento || "",
    barraCoctel: !!estado.barraCoctel,
    horasCoctel: estado.horasCoctel || 0,
    barraCopas: !!estado.barraCopas,
    horasCopas: estado.horasCopas || 0,
    logisticaEquipo: estado.logisticaEquipo || [],
  };
}
