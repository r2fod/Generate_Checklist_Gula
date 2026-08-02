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

import { carpasRecomendadas, carpasPorAlquilar, paxDelDiaGrande, CARPAS_EN_ALMACEN } from "../carpas.js";

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
    // Sin nombre, a logística le llega un "Evento sin nombre" y no sabe de qué habla
    noSe: false,
    falta: (r) => (!r.nombre || !r.nombre.trim()) && "Ponle un nombre, aunque sea provisional.",
    campos: [
      { id: "nombre", etiqueta: "Nombre del evento", ejemplo: "Boda de Ana y Luis" },
      { id: "sitio", etiqueta: "Sitio", ejemplo: "Finca La Alquería", sugerencias: "sitiosRecientes" },
    ],
  },
  {
    id: "cuando", tipo: "cuando", texto: "¿Qué día y a qué hora?",
    nota: "La hora de fin la usa logística para cuadrar los horarios del equipo.",
    // Sin día no se pueden calcular las recogidas (flores, minutas, alquileres), que
    // es justo lo que hace que alguien vaya a buscarlas a tiempo
    noSe: false,
    falta: (r) => !r.fecha && "Pon el día del evento: sin él no se pueden preparar las recogidas.",
  },
  {
    id: "gente", tipo: "numeros", texto: "¿Cuánta gente?",
    // El staff (cocina, refuerzo, proveedores que comen) no son invitados, pero están
    // ahí y beben agua y usan vasos: la app los cuenta aparte, con los camareros.
    nota: "El staff son los que están trabajando y no van en el número de invitados.",
    campos: [
      { id: "adultos", etiqueta: "Adultos", min: 0 },
      { id: "ninos", etiqueta: "Niños", min: 0 },
      { id: "staff", etiqueta: "Staff", min: 0 },
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
    // Antes se preguntaba si había sombra, que es preguntar por el problema en vez de
    // por lo que hay que cargar. Ahora se pregunta por las carpas y se propone el
    // número que sale de la gente, que se puede cambiar: quien rellena esto no tiene
    // por qué saber la cuenta, pero sí sabe si el sitio pide más o menos.
    id: "carpas", tipo: "opciones", texto: "¿Hacen falta carpas?",
    nota: (r) => {
      const pax = paxDelDiaGrande(r.dias);
      if (!pax) return `Tenemos ${CARPAS_EN_ALMACEN} en el almacén; de las que falten se avisa para alquilarlas.`;
      return `Con ${pax} personas el día de más gente salen ${carpasRecomendadas(pax)} (una cada 12 de pie, más la del buffet y la del camión). Se puede cambiar.`;
    },
    opciones: [
      { valor: "no", texto: "No hacen falta" },
      {
        valor: "si", texto: "Sí",
        conNumero: "¿Cuántas?",
        campoNumero: "numCarpas",
        sugerido: (r) => carpasRecomendadas(paxDelDiaGrande(r.dias)),
        // Lo que pase de las del almacén hay que alquilarlo, y eso se dice aquí en vez
        // de descubrirlo el día del rodaje
        avisoNumero: (n) => (carpasPorAlquilar(n) > 0
          ? `Tenemos ${CARPAS_EN_ALMACEN}: hay que alquilar ${carpasPorAlquilar(n)} a Support On Set, con su recogida.`
          : `Caben en el almacén (tenemos ${CARPAS_EN_ALMACEN}), no hay que alquilar ninguna.`),
      },
    ],
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
      { valor: "jamonero", texto: "Jamonero", soloEn: CON_BARRA },
      { valor: "dosPlatos", texto: "Dos platos principales", soloEn: CON_BARRA },
    ],
  },
  {
    // Los dos entrantes NO son excluyentes: en la app son dos interruptores distintos
    // (el de chupito carga vasos de chupito, el compartido carga platos extra) y hay
    // menús que llevan los dos. Antes esta pregunta obligaba a elegir uno y se perdía
    // el otro. Muchas veces tampoco es un entrante para compartir, son dos: por eso
    // lleva su número, y cada uno multiplica sus platos.
    id: "entrante", tipo: "marcar", texto: "¿Lleva entrante?",
    nota: "Puede llevar los dos: el de chupito y uno (o varios) para compartir.",
    opciones: [
      { valor: "chupito", texto: "De chupito" },
      { valor: "compartir", texto: "Para compartir", conNumero: "¿Cuántos entrantes distintos?" },
    ],
    soloEn: CON_BARRA,
  },
  {
    // Solo si hay entrante para compartir: es lo que decide cuántos platos extra se
    // cargan (un plato cada 3 personas no es lo mismo que cada 4).
    id: "entrantePersonas", tipo: "opciones", texto: "El entrante para compartir, ¿cada cuántas personas?",
    opciones: [
      { valor: 3, texto: "Un plato cada 3 personas" },
      { valor: 4, texto: "Un plato cada 4 personas" },
    ],
    soloEn: CON_BARRA,
    si: (r) => Array.isArray(r.entrante) && r.entrante.includes("compartir"),
  },
  {
    // Mismas palabras que los selectores de la app, para que lo que contesten se pueda
    // poner tal cual sin traducir nada por el camino.
    id: "nevera", tipo: "opciones", texto: "¿Qué nevera hace falta?",
    opciones: [
      { valor: "Mediana", texto: "Mediana" },
      { valor: "Grande", texto: "Grande" },
      { valor: "No lleva", texto: "No lleva" },
    ],
  },
  {
    id: "congelador", tipo: "opciones", texto: "¿Y congelador?",
    opciones: [
      { valor: "Mediana", texto: "Mediano" },
      { valor: "Grande", texto: "Grande" },
      { valor: "No lleva", texto: "No lleva" },
    ],
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
      { valor: "chillout", texto: "Chill out", conNumero: "¿Cuántos?", soloEn: CON_BARRA },
      { valor: "barril30", texto: "Barril de cerveza de 30L", soloEn: CON_BARRA },
      { valor: "barril50", texto: "Barril de cerveza de 50L", soloEn: CON_BARRA },
      { valor: "barbacoa", texto: "Barbacoa", soloEn: ["boda", "comunion", "corporativo"] },
      { valor: "mobiliario", texto: "Mobiliario extra de alquiler", soloEn: CON_BARRA },
      { valor: "palomitera", texto: "Palomitera", soloEn: CON_BARRA },
      { valor: "desayuno", texto: "Desayuno o recena", soloEn: CON_BARRA },
    ],
  },
  {
    id: "sillas", tipo: "opciones", texto: "¿Las sillas quién las pone?",
    // Cuántas no se pregunta: salen del pax. A quién se alquilan sí, porque cada
    // proveedor es una recogida distinta y es lo único que la app no puede deducir.
    nota: "Si las alquilamos, se crea sola su recogida y su devolución.",
    opciones: [
      { valor: "finca", texto: "Las pone la finca" },
      { valor: "Dealde", texto: "Las alquilamos a Dealde" },
      { valor: "Carvillo", texto: "Las alquilamos a Carvillo" },
      { valor: "Nuestras", texto: "Llevamos las nuestras" },
    ],
    soloEn: CON_BARRA,
  },

  // ── Lo que hay que imprimir (rodajes) ──────────────────────────────────────
  // En un rodaje el menú se imprime y se ponen etiquetas: si el archivo no viaja con
  // los datos, acaba en un WhatsApp perdido y el día del rodaje no lo encuentra nadie.
  // Va dentro del propio envío, así que la foto se encoge antes de subirse.
  {
    id: "imprimirMenu", tipo: "opciones", texto: "¿Hay que imprimir el menú?",
    opciones: [
      { valor: "no", texto: "No hace falta" },
      {
        valor: "si", texto: "Sí",
        conArchivo: { sufijo: "Archivo", etiqueta: "Sube el menú o hazle una foto" },
      },
    ],
    soloEn: ["produccion"],
  },
  {
    id: "etiquetas", tipo: "opciones", texto: "¿Hay que imprimir etiquetas?",
    nota: "La imagen que va en la máquina de etiquetas.",
    opciones: [
      { valor: "no", texto: "No hace falta" },
      {
        valor: "si", texto: "Sí",
        conArchivo: { sufijo: "Archivo", etiqueta: "Sube la imagen o hazle una foto" },
      },
    ],
    soloEn: ["produccion"],
  },

  // ── Mantelería y platos ────────────────────────────────────────────────────
  // Cuántos manteles lo calcula la app por las mesas: aquí solo se elige de cuáles.
  {
    id: "manteles", tipo: "opciones", texto: "¿De qué color los manteles?",
    nota: "Cuántos hacen falta lo calcula la app; esto es solo el color.",
    opciones: [
      { valor: "Beige", texto: "Beige" },
      { valor: "Negros", texto: "Negros" },
      {
        valor: "Ambos", texto: "De los dos",
        conNumero: "¿Qué parte en beige? (%)",
        campoNumero: "porcentajeBeige",
        sugerido: () => 50,
        avisoNumero: (n) => `${n}% beige y ${100 - Math.min(100, Math.max(0, n))}% negros, repartiendo el total que salga.`,
      },
    ],
  },
  {
    // En una boda van siempre de tela, así que ahí no se pregunta
    id: "servilletasTela", tipo: "opciones", texto: "¿Servilletas de tela?",
    nota: "Si no, van de papel.",
    opciones: [
      { valor: "si", texto: "Sí, de tela" },
      { valor: "no", texto: "No, de papel" },
    ],
    soloEn: ["comunion", "corporativo", "cumpleanos", "produccion"],
  },
  {
    // Se elige de una lista y no se escribe libre a propósito: el nombre del plato
    // sale tal cual en la checklist y ES la identidad del item, así que "blanco",
    // "blancos" y "el blanco liso" serían tres cosas distintas y cada corrección
    // perdería las marcas de carga.
    id: "estiloPlato", tipo: "opciones", texto: "¿Qué plato lleva?",
    opciones: [
      { valor: "Blanco liso", texto: "Blanco liso" },
      { valor: "Relieve blanco", texto: "Relieve blanco" },
      { valor: "Verde", texto: "Verde" },
      { valor: "Metálico", texto: "Metálico" },
      {
        valor: "Otro", texto: "Otro (escribirlo)",
        conCampos: [{ sufijo: "Cual", etiqueta: "¿Cuál?", ejemplo: "Pizarra, madera..." }],
      },
    ],
    soloEn: CON_BARRA,
  },

  // ── Lo que hay que ir a buscar ─────────────────────────────────────────────
  // Flores y minutas no se cargan del almacén: alguien tiene que ir a recogerlas a
  // un sitio y un día concretos. Por eso no son un interruptor más, sino que crean
  // su recogida con su fecha, que es lo que luego avisa.
  {
    id: "flores", tipo: "opciones", texto: "¿Lleva flores?",
    nota: "Se añade a las recogidas con su día, para que no se quede nadie sin ir a por ellas.",
    opciones: [
      { valor: "no", texto: "No lleva" },
      {
        valor: "si", texto: "Sí",
        conCampos: [
          { sufijo: "Quien", etiqueta: "¿A quién se le piden?", ejemplo: "Floristería..." },
          { sufijo: "Fecha", etiqueta: "¿Qué día se recogen?", tipo: "date" },
        ],
      },
    ],
  },
  {
    id: "minutas", tipo: "opciones", texto: "¿Lleva minutas?",
    nota: "Igual que las flores: se añade a las recogidas con su día.",
    opciones: [
      { valor: "no", texto: "No lleva" },
      {
        valor: "si", texto: "Sí",
        conCampos: [
          { sufijo: "Quien", etiqueta: "¿Dónde se imprimen?", ejemplo: "Imprenta..." },
          { sufijo: "Fecha", etiqueta: "¿Qué día se recogen?", tipo: "date" },
        ],
      },
    ],
    // En un rodaje no se ponen minutas
    soloEn: CON_BARRA,
  },

  {
    // Lo que hay que comprar (hielo, hielo seco, algo del súper) no es material de
    // almacén: alguien tiene que pasar a comprarlo. Va a Compras, que ya tiene su
    // aviso, en vez de perderse en las notas.
    id: "comprar", tipo: "texto-largo", texto: "¿Hay que comprar algo?",
    nota: "Hielo, refrescos concretos, algo del súper... Una cosa por línea.",
    campo: "comprar",
    ejemplo: "20 sacos de hielo\nHielo seco",
  },

  // ── Cierre ─────────────────────────────────────────────────────────────────
  {
    id: "notas", tipo: "texto-largo", texto: "¿Algo que haya que tener en cuenta?",
    campo: "notas",
    nota: "Alergias, peticiones del cliente, con quién hay que hablar en el sitio...",
    noSe: false,
  },
];

// Preguntas que le tocan a un tipo de evento. Algunas dependen de otra respuesta
// (`si`): preguntar por las carpas de alquiler cuando ni siquiera van carpas sería
// una pantalla de más, y este formulario se rellena de pie y con prisa.
export function preguntasDe(tipo, respuestas = null) {
  return PREGUNTAS.filter(p => {
    if (p.soloEn && !p.soloEn.includes(tipo)) return false;
    if (p.si && !(respuestas !== null && p.si(respuestas))) return false;
    // Una pregunta de elegir cuyas opciones no aplican a este tipo de evento sería
    // una pantalla en blanco: si a un rodaje no le toca ninguna de las opciones de
    // "¿está presupuestado algo de esto?", esa pregunta no existe para el rodaje.
    if ((p.tipo === "marcar" || p.tipo === "opciones") && p.id !== "tipo"
        && opcionesDe(p, tipo).length === 0) return false;
    return true;
  });
}

// Opciones de una pregunta de marcar, filtradas por tipo de evento
export function opcionesDe(pregunta, tipo) {
  return (pregunta.opciones || []).filter(o => !o.soloEn || o.soloEn.includes(tipo));
}

export const fmtFechaCorta = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
};

// Una respuesta en palabras. Lo usan las dos puntas: el repaso antes de enviar y la
// bandeja de la app, para que quien revisa el envío lea exactamente lo mismo que vio
// quien lo mandó. Vive aquí, con el guion, y no en una de las dos pantallas.
export function resumirRespuesta(p, r, tipo) {
  const v = r[p.id];
  if (p.tipo === "textos") return p.campos.map(c => r[c.id]).filter(Boolean).join(" · ") || "sin contestar";
  if (p.tipo === "numeros") return p.campos.map(c => r[c.id] ? `${r[c.id]} ${c.etiqueta.toLowerCase()}` : "").filter(Boolean).join(" · ") || "sin contestar";
  if (p.tipo === "cuando") return [fmtFechaCorta(r.fecha), r.horaInicio, r.horaFin && `a ${r.horaFin}`].filter(Boolean).join(" · ") || "sin contestar";
  if (p.tipo === "texto-largo") {
    const txt = r[p.campo || "notas"];
    return txt ? txt.replace(/\n+/g, " · ").slice(0, 70) : "nada";
  }
  if (p.tipo === "dias") {
    const d = (r.dias || []).filter(Boolean);
    return d.length ? `${d.join(" + ")} en ${d.length} días` : "sin contestar";
  }
  if (v === null || v === undefined) return "no lo sé";
  if (p.tipo === "horas") return v === 0 ? "no hay" : `${v}h`;
  if (p.tipo === "marcar") {
    if (!v.length) return "nada";
    return opcionesDe(p, tipo).filter(o => v.includes(o.valor)).map(o => o.texto).join(", ");
  }
  const op = (p.id === "tipo" ? TIPOS_EVENTO : opcionesDe(p, tipo)).find(o => o.valor === v);
  if (!op) return String(v);
  // Las opciones que arrastran algo detrás se leen con ello: "Sí · Floristería X ·
  // 10 ago" dice bastante más que un "Sí" a secas.
  const extra = [];
  (op.conCampos || []).forEach(c => {
    const val = r[`${p.id}${c.sufijo}`];
    if (val) extra.push(c.tipo === "date" ? fmtFechaCorta(val) : val);
  });
  if (op.conArchivo) {
    const a = r[`${p.id}${op.conArchivo.sufijo}`];
    extra.push(a && a.datos ? (a.nombre || "archivo adjunto") : "sin archivo");
  }
  return extra.length ? `${op.texto} · ${extra.join(" · ")}` : op.texto;
}

// El envío entero en palabras, para la bandeja: pregunta y respuesta, en el orden en
// que se contestaron, marcando lo que se dejó sin contestar.
export function resumirEnvio(respuestas = {}) {
  const tipo = respuestas.tipo || "boda";
  return preguntasDe(tipo, respuestas).map(p => ({
    id: p.id,
    pregunta: p.texto,
    respuesta: resumirRespuesta(p, respuestas, tipo),
    sinContestar: respuestas[p.id] === undefined || respuestas[p.id] === null,
  }));
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
  // La hora de FIN no es un campo del evento: en la app el horario vive en el equipo de
  // logística, persona a persona, y eso no lo decide la oficina. Viaja en el envío y la
  // bandeja la enseña para cuadrar el equipo al aceptarlo, pero no se escribe sola.
  pon("notasEvento", r.notas);

  if (tipo === "produccion") {
    if (Array.isArray(r.dias) && r.dias.length) estado.diasProduccion = r.dias.map(String);
    if (puesto(r.carpas)) {
      estado.llevaCarpas = r.carpas === "si";
      if (r.numCarpas > 0) {
        estado.numCarpas = r.numCarpas;
        // Lo que pasa de lo que hay en almacén se alquila solo, con su recogida: no
        // hace falta preguntarlo aparte, se sabe con el número.
        estado.alquilaCarpas = carpasPorAlquilar(r.numCarpas) > 0;
      }
    }
    if (puesto(r.generador)) estado.llevaGenerador = r.generador === "si";
    // En un rodaje las sillas son nuestras: no se pregunta y no genera recogida
    estado.origenSillas = "Nuestras";
  } else {
    pon("pax", r.adultos);
    pon("ninos", r.ninos);
    pon("numStaff", r.staff);
    if (puesto(r.coctel)) { estado.barraCoctel = r.coctel > 0; estado.horasCoctel = r.coctel || 0; }
    if (puesto(r.copas)) { estado.barraCopas = r.copas > 0; estado.horasCopas = r.copas || 0; }
    if (puesto(r.servicio)) {
      estado.soloBandeja = r.servicio === "bandeja";
      // De pie se sirve con menos camareros que un banquete sentado (1÷18 frente a 1÷12)
      estado.paxPorCamarero = r.servicio === "bandeja" ? 18 : 12;
    }
    // Los dos entrantes son independientes: un menú puede llevar chupito Y compartido
    if (Array.isArray(r.entrante)) {
      estado.llevaEntrante = marcado("entrante", "chupito");
      estado.entranteCompartido = marcado("entrante", "compartir");
      if (estado.entranteCompartido) {
        // Cada cuántas personas va un plato, y cuántos entrantes distintos hay (lo
        // normal es 1, pero hay menús con 2). Si no lo contestan, manda el valor de
        // siempre de la app.
        if (puesto(r.entrantePersonas)) estado.personasPorPlatoEntrante = r.entrantePersonas;
        if (r.compartirNumero > 0) estado.numEntrantesCompartir = r.compartirNumero;
      }
    }
    // "finca" = no las llevamos nosotros; el resto es literalmente el valor que usa la
    // app (Dealde / Carvillo / Nuestras), y solo los dos primeros crean recogida
    if (puesto(r.sillas)) estado.origenSillas = r.sillas === "finca" ? "No llevan" : r.sillas;
    if (Array.isArray(r.extras)) {
      estado.tieneBrindisCava = marcado("extras", "brindis");
      estado.tipoBBQ = marcado("extras", "barbacoa") ? "Grande" : "No lleva";
      estado.llevaMobiliarioAlquiler = marcado("extras", "mobiliario");
      estado.hayDesayuno = marcado("extras", "desayuno");
      estado.tamanoBarril = marcado("extras", "barril50") ? "50L"
        : marcado("extras", "barril30") ? "30L" : "No lleva";
    }
  }

  if (puesto(r.manteles)) {
    estado.colorManteles = r.manteles;
    if (r.manteles === "Ambos" && r.porcentajeBeige > 0) estado.porcentajeBeige = r.porcentajeBeige;
  }
  if (puesto(r.servilletasTela)) estado.fuerzaTextilTela = r.servilletasTela === "si";
  if (puesto(r.estiloPlato)) {
    // "Otro" viaja con lo que hayan escrito; si lo dejaron vacío no se pisa el de la app
    const suyo = (r.estiloPlatoCual || "").trim();
    if (r.estiloPlato !== "Otro") estado.estiloPlatoPrincipal = r.estiloPlato;
    else if (suyo) estado.estiloPlatoPrincipal = suyo;
  }
  if (puesto(r.horno)) estado.tipoHorno = r.horno;
  if (puesto(r.nevera)) estado.tipoNevera = r.nevera;
  if (puesto(r.congelador)) estado.tipoCongelador = r.congelador;
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
  return preguntasDe(tipo, r)
    .filter(p => r[p.id] === undefined || r[p.id] === null)
    .map(p => p.id);
}

// ─── LO QUE HAY QUE IR A BUSCAR ────────────────────────────────────────────────
// Flores y minutas no son un interruptor de la app: son un sitio y un día al que
// alguien tiene que ir. Se convierten en recogidas normales (de las escritas a
// mano), así que entran en los avisos y nada las quita sola.
//
// Va aparte de aRespuestasDeLaApp a propósito: eso devuelve campos del evento, y
// esto son líneas que se SUMAN a las recogidas que el evento ya tenga. Si se
// devolvieran juntas, aplicar un envío borraría las recogidas de antes.
export function recogidasDelEnvio(r = {}) {
  const salida = [];
  const mete = (id, etiqueta) => {
    if (r[id] !== "si") return;
    const quien = (r[`${id}Quien`] || "").trim();
    salida.push({
      concepto: quien ? `${etiqueta} (${quien})` : etiqueta,
      fecha: r[`${id}Fecha`] || "",
      hora: "",
    });
  };
  mete("flores", "Flores");
  mete("minutas", "Minutas");
  return salida;
}

// Los archivos que trae un envío (el menú a imprimir, la imagen de las etiquetas),
// listos para enseñarlos o descargarlos desde la bandeja.
export function archivosDelEnvio(r = {}) {
  return [
    { id: "imprimirMenuArchivo", etiqueta: "Menú para imprimir" },
    { id: "etiquetasArchivo", etiqueta: "Imagen de etiquetas" },
  ]
    .map(x => ({ ...x, archivo: r[x.id] }))
    .filter(x => x.archivo && x.archivo.datos);
}

// ─── QUÉ HA CAMBIADO ENTRE DOS VERSIONES DE UN ENVÍO ───────────────────────────
// Cuando la oficina corrige algo, lo que importa no es el envío entero: es qué han
// cambiado. Se compara pregunta a pregunta y se dice en palabras ("Cuánta gente:
// 120 adultos → 140 adultos"), que es lo que se lee de un vistazo en el aviso.
export function cambiosEntreRespuestas(antes = {}, ahora = {}) {
  const tipo = ahora.tipo || antes.tipo || "boda";
  const cambios = [];
  preguntasDe(tipo, ahora).forEach(p => {
    const a = resumirRespuesta(p, antes, tipo);
    const b = resumirRespuesta(p, ahora, tipo);
    if (a !== b) cambios.push({ id: p.id, pregunta: p.texto, antes: a, ahora: b });
  });
  return cambios;
}

// Lo que falta por contestar y no se puede dejar en blanco. Devuelve [{ id, aviso }]
// para poder llevar a esa pregunta desde el repaso en vez de solo decir "falta algo".
export function loQueFalta(respuestas = {}) {
  const tipo = respuestas.tipo || "boda";
  return preguntasDe(tipo, respuestas)
    .map(p => ({ id: p.id, aviso: p.falta ? p.falta(respuestas) : "" }))
    .filter(x => !!x.aviso);
}

// Lo que hay que comprar, en líneas, tal como las guarda la app en Compras. Va aparte
// de aRespuestasDeLaApp por lo mismo que las recogidas: son líneas que se SUMAN a lo
// que el evento ya tuviera, no un campo que lo sustituye.
export function comprasDelEnvio(r = {}) {
  return String(r.comprar || "")
    .split("\n")
    .map(l => l.replace(/^[\s•·*-]+/, "").trim())
    .filter(Boolean)
    .map(concepto => ({ concepto, cantidad: "", comprado: false }));
}
