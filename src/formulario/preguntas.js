// ─── GUION DEL FORMULARIO ──────────────────────────────────────────────────────
// Lo que se le pregunta a la oficina y a qué campo de la app va cada respuesta.
//
// Dos reglas que gobiernan todo esto:
//
//   1. El formulario NO calcula nada. Solo recoge respuestas y las traduce a los
//      mismos campos que rellenarías tú a mano. La checklist la siguen generando
//      buildChecklistBoda / Cumpleanos / Produccion, sin enterarse de que existe
//      este fichero.
//   2. Solo se pregunta lo que ellas pueden saber. Todo lo que sale del pax o de la
//      fecha (paella, cafetera, camareros, carpas, bandejas, verano...) y todo lo
//      que es decisión de logística (nevera, congelador, plancha, armario caliente,
//      estilo de platos, personal, tarifas) NO se pregunta: se queda con su valor
//      por defecto y lo ajustas al confirmar el envío.
//
// Cada pregunta lleva:
//   id        · clave con la que se guarda la respuesta
//   tipo      · cómo se pinta (ver Formulario.jsx)
//   texto     · la pregunta, con sus palabras
//   nota      · aclaración pequeña debajo, cuando la respuesta tiene consecuencias
//   soloEn    · tipos de evento en los que aplica (vacío = todos)
//   opciones  · para las de elegir
//   noSe      · si admite "No lo sé" (por defecto sí; el id se guarda como null)

export const TIPOS_EVENTO = [
  { valor: "boda", texto: "Boda" },
  { valor: "comunion", texto: "Comunión o bautizo" },
  { valor: "corporativo", texto: "Evento de empresa" },
  { valor: "cumpleanos", texto: "Cumpleaños" },
  { valor: "produccion", texto: "Producción o rodaje" },
];

const CON_BARRA = ["boda", "comunion", "corporativo", "cumpleanos"];

export const PREGUNTAS = [
  // ── Tronco común ───────────────────────────────────────────────────────────
  {
    id: "tipo", tipo: "opciones", texto: "¿Qué tipo de evento es?",
    opciones: TIPOS_EVENTO, noSe: false,
  },
  {
    id: "nombreYsitio", tipo: "textos", texto: "¿Cómo lo llamamos y dónde es?",
    campos: [
      { id: "nombre", etiqueta: "Nombre del evento", ejemplo: "Boda de Ana y Luis" },
      { id: "sitio", etiqueta: "Sitio", ejemplo: "Finca La Alquería", sugerencias: "sitiosRecientes" },
    ],
  },
  {
    id: "cuando", tipo: "cuando", texto: "¿Qué día y a qué hora?",
    nota: "La hora de fin es para calcular los horarios del equipo de logística.",
  },
  {
    id: "gente", tipo: "numeros", texto: "¿Cuánta gente?",
    campos: [
      { id: "adultos", etiqueta: "Adultos", min: 0 },
      { id: "ninos", etiqueta: "Niños", min: 0 },
    ],
    soloEn: ["boda", "comunion", "corporativo", "cumpleanos"],
  },

  // ── Producción ─────────────────────────────────────────────────────────────
  {
    id: "dias", tipo: "dias", texto: "¿Cuántos días y cuánta gente cada día?",
    nota: "El equipo se calcula para el día de más gente y la comida para la suma de todos.",
    soloEn: ["produccion"],
  },
  {
    id: "sombra", tipo: "opciones", texto: "¿Hay sombra o sitio techado?",
    nota: "Si no, se cargan carpas con sus paredes y sus pesas.",
    opciones: [{ valor: "si", texto: "Sí, hay" }, { valor: "no", texto: "No hay" }],
    soloEn: ["produccion"],
  },
  {
    id: "generador", tipo: "opciones", texto: "¿Alquilar generador?",
    nota: "Se pide a Support On Set, con su recogida y su devolución.",
    opciones: [{ valor: "si", texto: "Sí" }, { valor: "no", texto: "No hace falta" }],
    soloEn: ["produccion"],
  },

  // ── Barra ──────────────────────────────────────────────────────────────────
  {
    id: "coctel", tipo: "horas", texto: "¿Hay cóctel o aperitivo? ¿Cuántas horas?",
    soloEn: CON_BARRA,
  },
  {
    id: "copas", tipo: "horas", texto: "¿Hay barra libre de copas? ¿Cuántas horas?",
    soloEn: CON_BARRA,
  },

  // ── Cómo se come ───────────────────────────────────────────────────────────
  {
    id: "servicio", tipo: "opciones", texto: "¿Cómo se come?",
    nota: "Si es todo en bandeja no se cargan platos de ningún tipo, solo bandejas y cubiertos.",
    opciones: [
      { valor: "sentados", texto: "Sentados, con platos" },
      { valor: "bandeja", texto: "De pie, todo en bandeja" },
    ],
    soloEn: CON_BARRA,
  },

  // ── Menú ───────────────────────────────────────────────────────────────────
  {
    id: "menu", tipo: "marcar", texto: "¿Qué lleva el menú?",
    opciones: [
      { valor: "paella", texto: "Paella" },
      { valor: "frito", texto: "Algo frito" },
      { valor: "jamonero", texto: "Jamonero" },
      { valor: "dosPlatos", texto: "Dos platos principales", soloEn: CON_BARRA },
    ],
  },
  {
    id: "entrante", tipo: "opciones", texto: "¿Lleva entrante?",
    opciones: [
      { valor: "no", texto: "No lleva" },
      { valor: "chupito", texto: "De chupito" },
      { valor: "compartir3", texto: "Compartido, cada 3 personas" },
      { valor: "compartir4", texto: "Compartido, cada 4 personas" },
    ],
    soloEn: CON_BARRA,
  },
  {
    id: "horno", tipo: "opciones", texto: "¿Qué horno hace falta?",
    opciones: [
      { valor: "Pequeño", texto: "Pequeño" },
      { valor: "Grande", texto: "Grande" },
      { valor: "Ambos", texto: "Los dos" },
      { valor: "No lleva", texto: "No lleva" },
    ],
  },

  // ── Lo que se haya presupuestado ───────────────────────────────────────────
  {
    id: "extras", tipo: "marcar", texto: "¿Está presupuestado algo de esto?",
    opciones: [
      { valor: "brindis", texto: "Brindis con cava", soloEn: CON_BARRA },
      { valor: "chillout", texto: "Chill out", conNumero: "¿Cuántos?" },
      { valor: "barril30", texto: "Barril de cerveza de 30L", soloEn: CON_BARRA },
      { valor: "barril50", texto: "Barril de cerveza de 50L", soloEn: CON_BARRA },
      { valor: "barbacoa", texto: "Barbacoa", soloEn: ["boda", "comunion", "corporativo"] },
      { valor: "mobiliario", texto: "Mobiliario extra de alquiler", soloEn: CON_BARRA },
      { valor: "palomitera", texto: "Palomitera" },
      { valor: "desayuno", texto: "Desayuno o recena", soloEn: CON_BARRA },
    ],
  },
  {
    id: "sillas", tipo: "opciones", texto: "¿Las sillas las pone la finca?",
    nota: "Si las llevamos nosotros, se alquilan y se crea su recogida.",
    opciones: [
      { valor: "finca", texto: "Sí, las pone la finca" },
      { valor: "nosotros", texto: "No, las llevamos nosotros" },
    ],
    soloEn: CON_BARRA,
  },

  // ── Cierre ─────────────────────────────────────────────────────────────────
  {
    id: "notas", tipo: "texto-largo", texto: "¿Algo que haya que tener en cuenta?",
    nota: "Alergias, peticiones del cliente, con quién hay que hablar en el sitio...",
    noSe: false,
  },
];

// Preguntas que le tocan a un tipo de evento
export function preguntasDe(tipo) {
  return PREGUNTAS.filter(p => !p.soloEn || p.soloEn.includes(tipo));
}

// Opciones de una pregunta de marcar, filtradas por tipo de evento
export function opcionesDe(pregunta, tipo) {
  return (pregunta.opciones || []).filter(o => !o.soloEn || o.soloEn.includes(tipo));
}

// ─── RESPUESTAS → CONFIGURACIÓN DE LA APP ──────────────────────────────────────
// Devuelve SOLO los campos que se han contestado. Lo que quede sin respuesta (o
// contestado con "No lo sé") no aparece, así el evento se queda con el valor por
// defecto de la app y tú lo ajustas al confirmarlo.
export function aRespuestasDeLaApp(r = {}) {
  const marcado = (id, v) => Array.isArray(r[id]) && r[id].includes(v);
  const puesto = (v) => v !== undefined && v !== null && v !== "";
  const estado = {};
  const pon = (campo, valor) => { if (puesto(valor)) estado[campo] = valor; };

  const tipo = r.tipo || "boda";
  pon("evento", r.tipo);
  pon("nombreEvento", r.nombre);
  pon("ubicacion", r.sitio);
  pon("fechaEvento", r.fecha);
  pon("horaInicio", r.horaInicio);
  pon("horaFin", r.horaFin);
  pon("notasEvento", r.notas);

  if (tipo === "produccion") {
    if (Array.isArray(r.dias) && r.dias.length) estado.diasProduccion = r.dias.map(String);
    if (puesto(r.sombra)) estado.llevaCarpas = r.sombra === "no";
    if (puesto(r.generador)) estado.llevaGenerador = r.generador === "si";
    // En un rodaje las sillas son nuestras: no se pregunta y no genera recogida
    estado.origenSillas = "Nuestras";
  } else {
    pon("pax", r.adultos);
    pon("ninos", r.ninos);
    if (puesto(r.coctel)) { estado.barraCoctel = r.coctel > 0; estado.horasCoctel = r.coctel || 0; }
    if (puesto(r.copas)) { estado.barraCopas = r.copas > 0; estado.horasCopas = r.copas || 0; }
    if (puesto(r.servicio)) {
      estado.soloBandeja = r.servicio === "bandeja";
      // De pie se sirve con menos camareros que un banquete sentado (1÷18 frente a 1÷12)
      estado.paxPorCamarero = r.servicio === "bandeja" ? 18 : 12;
    }
    if (puesto(r.entrante)) {
      estado.llevaEntrante = r.entrante === "chupito";
      estado.entranteCompartido = r.entrante === "compartir3" || r.entrante === "compartir4";
      if (estado.entranteCompartido) estado.personasPorPlatoEntrante = r.entrante === "compartir3" ? 3 : 4;
    }
    if (puesto(r.sillas)) estado.origenSillas = r.sillas === "finca" ? "No llevan" : "Dealde";
    if (Array.isArray(r.extras)) {
      estado.tieneBrindisCava = marcado("extras", "brindis");
      estado.tipoBBQ = marcado("extras", "barbacoa") ? "Grande" : "No lleva";
      estado.llevaMobiliarioAlquiler = marcado("extras", "mobiliario");
      estado.hayDesayuno = marcado("extras", "desayuno");
      estado.tamanoBarril = marcado("extras", "barril50") ? "50L"
        : marcado("extras", "barril30") ? "30L" : "No lleva";
    }
  }

  if (puesto(r.horno)) estado.tipoHorno = r.horno;
  if (Array.isArray(r.menu)) {
    estado.llevaPaella = marcado("menu", "paella");
    estado.tieneFrituras = marcado("menu", "frito");
    estado.llevaJamonero = marcado("menu", "jamonero");
    if (tipo !== "produccion") estado.dobleServicio = marcado("menu", "dosPlatos");
  }
  if (Array.isArray(r.extras)) {
    estado.llevaChillOut = marcado("extras", "chillout");
    if (estado.llevaChillOut && r.chilloutNumero > 0) estado.numChillOut = r.chilloutNumero;
    estado.llevaPalomitera = marcado("extras", "palomitera");
  }

  return estado;
}

// Qué campos ha decidido la app por su cuenta (no los ha contestado nadie). Sirve
// para enseñarlos en otro color en la bandeja: de un vistazo se ve qué revisar.
export function camposSinContestar(r = {}, tipo = "boda") {
  return preguntasDe(tipo)
    .filter(p => r[p.id] === undefined || r[p.id] === null)
    .map(p => p.id);
}
