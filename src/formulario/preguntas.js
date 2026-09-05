// ─── GUION DEL FORMULARIO ──────────────────────────────────────────────────────
// Lo que se le pregunta a la oficina y a qué campo de la app va cada respuesta.
//
// Dos reglas que gobiernan todo esto:
//
//   1. El formulario NO calcula nada. Solo recoge respuestas y las traduce a los
//      mismos campos que rellenarías tú a mano. La checklist la siguen generando
//      buildChecklistBoda / Cumpleanos / Produccion, sin enterarse de que existe
//      este fichero.
//   2. Solo se pregunta lo que ellas pueden saber. Lo que sale del pax o de la fecha
//      (paella, cafetera, camareros, bandejas, verano...) y lo que es decisión de
//      logística (plancha de gas, jarras, aguas pequeñas, personal, tarifas) NO se
//      pregunta: se queda con su valor por defecto y lo ajustas al confirmar el
//      envío. Lo que sí se pregunta aunque no sea "del cliente" es lo que ARRASTRA
//      UNA RECOGIDA (sillas, armario caliente, mobiliario, carpas, generador,
//      flores, minutas): si eso no viaja, la app carga el material y nadie va a
//      buscarlo.
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
import { paellasPorPax, tallaPorPax } from "../paella.js";

// La gente que manda para el material. En un rodaje es el día de más gente (el equipo
// se monta una vez); en el resto, los adultos. Sirve para proponer números, no para
// calcular la checklist: eso lo sigue haciendo la app con sus propios campos.
const paxDeLaGente = (r = {}) =>
  (r.tipo === "produccion" ? paxDelDiaGrande(r.dias) : parseInt(r.adultos, 10) || 0);

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
    // En un rodaje las aguas pequeñas van siempre (son el agua de beber de todo el
    // día): lo que cambia es el envase, y eso lo sabe quien lo ha presupuestado.
    id: "aguaPequena", tipo: "opciones", texto: "Las aguas pequeñas, ¿de qué son?",
    nota: "En un rodaje van siempre; esto es solo el envase.",
    opciones: [
      { valor: "Plástico", texto: "De plástico" },
      { valor: "Cartón", texto: "De cartón" },
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
      // Cuántas sartenes parisiene, que no es lo mismo un frito que tres a la vez: cada
      // una lleva su difusor, su trípode y su bombona, y la app se quedaba siempre en una.
      { valor: "frito", texto: "Algo frito", conNumero: "¿Cuántas sartenes parisiene?", campoNumero: "numFrituras" },
      { valor: "jamonero", texto: "Jamonero", soloEn: CON_BARRA },
      { valor: "dosPlatos", texto: "Dos platos principales", soloEn: CON_BARRA },
    ],
  },
  {
    // La talla salía sola del pax (hasta 40 pequeña, hasta 80 mediana, y grande de ahí
    // para arriba) y nunca se preguntaba. Pero el pax no lo sabe todo: con el mismo
    // número de gente cocina puede querer una talla u otra según el arroz y el sitio,
    // y eso lo sabe quien lo ha hablado con el cliente.
    id: "tamanoPaella", tipo: "opciones", texto: "La paella, ¿de qué tamaño?",
    nota: (r) => {
      const pax = paxDeLaGente(r);
      return pax
        ? `Con ${pax} personas saldría ${tallaPorPax(pax)}. Solo hay que tocarlo si cocina quiere otra.`
        : "Si no lo sabes, se pone la que salga por la gente.";
    },
    opciones: [
      { valor: "Auto", texto: "La que salga por la gente" },
      { valor: "Pequeña", texto: "Pequeña" },
      { valor: "Mediana", texto: "Mediana" },
      { valor: "Grande", texto: "Grande" },
    ],
    si: (r) => Array.isArray(r.menu) && r.menu.includes("paella"),
  },
  {
    // Y cuántas. La cuenta de la app es una cada 30 personas, pero hay menús en los que
    // se prefieren dos medianas a una grande (o al revés, y se hacen dos pases con la
    // misma). El número arrastra paletas, difusores, trípodes, paravientos y bombonas,
    // así que decirlo aquí evita cargar de menos.
    id: "cuantasPaellas", tipo: "opciones", texto: "¿Cuántas paellas se hacen?",
    nota: (r) => {
      const pax = paxDeLaGente(r);
      return pax
        ? `Con ${pax} personas salen ${paellasPorPax(pax, r.tipo)} (una cada 30). Cada una lleva su paleta, su trípode y su bombona.`
        : "Cada paella lleva su paleta, su trípode y su bombona.";
    },
    opciones: [
      { valor: "auto", texto: "Las que salgan por la gente" },
      {
        valor: "otras", texto: "Otro número",
        conNumero: "¿Cuántas?",
        campoNumero: "numPaellas",
        sugerido: (r) => paellasPorPax(paxDeLaGente(r), r.tipo) || 1,
      },
    ],
    si: (r) => Array.isArray(r.menu) && r.menu.includes("paella"),
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

  // El café se calculaba SIEMPRE para invitados, sin preguntar: en un evento donde
  // el cliente no lo pide (o ya lleva el suyo) sobraba cafetera, tazas y cápsulas
  // enteras. Aplica a los cinco tipos de evento porque los cinco llevan café — el
  // "no" no lo quita del todo: el equipo siempre tiene su cafetera de mantenimiento
  // aparte (ver aRespuestasDeLaApp/calcCafe), esto solo decide si además se sirve
  // a los invitados.
  {
    id: "cafe", tipo: "opciones", texto: "El café, ¿es para los invitados o solo para el personal?",
    opciones: [
      { valor: "invitados", texto: "Para los invitados" },
      { valor: "personal", texto: "Solo para el personal" },
    ],
  },

  // ── Lo que se haya presupuestado ───────────────────────────────────────────
  {
    id: "extras", tipo: "marcar", texto: "¿Está presupuestado algo de esto?",
    opciones: [
      { valor: "brindis", texto: "Brindis con cava", soloEn: CON_BARRA },
      { valor: "chillout", texto: "Chill out", conNumero: "¿Cuántos?", soloEn: CON_BARRA },
      // Cuántos barriles: hasta ahora se daba por hecho que era uno
      { valor: "barril30", texto: "Barril de cerveza de 30L", conNumero: "¿Cuántos?", campoNumero: "numBarriles", soloEn: CON_BARRA },
      { valor: "barril50", texto: "Barril de cerveza de 50L", conNumero: "¿Cuántos?", campoNumero: "numBarriles", soloEn: CON_BARRA },
      // Van aquí y no en una pregunta propia: son cosas que se presupuestan, y así no
      // se añade otra pantalla a un formulario que ya tiene quince
      { valor: "jarras", texto: "Jarras de cristal en mesa", soloEn: ["boda", "comunion", "corporativo"] },
      { valor: "barbacoa", texto: "Barbacoa", soloEn: ["boda", "comunion", "corporativo"] },
      { valor: "mobiliario", texto: "Mobiliario extra de alquiler", soloEn: CON_BARRA },
      { valor: "palomitera", texto: "Palomitera", soloEn: CON_BARRA },
      { valor: "desayuno", texto: "Desayuno o recena", soloEn: CON_BARRA },
    ],
  },
  // ── Lo que se sale de lo normal ────────────────────────────────────────────
  // Platos, platos de postre, cubiertos y bandejas mixtas van SIEMPRE salvo que se diga
  // lo contrario, y la plancha de gas no va salvo que se diga que sí. El formulario no
  // preguntaba por nada de esto, así que un evento creado desde aquí se quedaba con esos
  // valores sin que nadie los hubiera confirmado — y no había forma de decir que esta
  // boda concreta va sin cubiertos, o con bandejas solo de plata.
  //
  // Va en UNA pantalla de casillas y no en cuatro preguntas a propósito: la respuesta es
  // "lo de siempre" en casi todos los eventos, y el formulario ya son más de veinte
  // pantallas para una boda. Cuatro preguntas más cuya respuesta no cambia nunca es la
  // mejor forma de que se empiece a contestar sin leer.
  {
    id: "distinto", tipo: "marcar", texto: "¿Algo distinto de lo normal?",
    nota: "Sin marcar nada va lo de siempre: platos, platos de postre, cubiertos y bandejas de los dos tipos.",
    opciones: [
      { valor: "sinPlatos", texto: "No llevamos platos" },
      { valor: "sinPlatosPostre", texto: "No llevamos platos de postre" },
      { valor: "sinCubiertos", texto: "No llevamos cubiertos" },
      // La plancha solo en banquetes: un rodaje no la lee, y enseñar una casilla que no
      // hace nada es peor que no enseñarla.
      { valor: "planchaGas", texto: "Lleva plancha de gas", conNumero: "¿Cuántas?", campoNumero: "numPlanchasGas", soloEn: CON_BARRA },
      // Las bandejas no son un sí/no sino una elección de tres. Marcando una va esa;
      // sin marcar ninguna —o marcando las dos, que es llevar de los dos tipos— quedan
      // mixtas, que es lo de siempre. Así entra aquí en vez de gastar otra pantalla.
      { valor: "bandejasMadera", texto: "Bandejas solo de madera" },
      { valor: "bandejasPlata", texto: "Bandejas solo de plata" },
    ],
    // En todos los tipos: un rodaje también carga platos, cubiertos y bandejas.
  },
  {
    // Es alquiler de Dealde, así que no basta con cargarlo: hay que ir a buscarlo y
    // devolverlo. Al marcarlo se crea su recogida sola. En un rodaje no se lleva.
    id: "armarioCaliente", tipo: "opciones", texto: "¿Lleva armario caliente?",
    nota: "Se alquila a Dealde: se crea sola su recogida y su devolución.",
    opciones: [
      { valor: "si", texto: "Sí" },
      { valor: "no", texto: "No lleva" },
    ],
    soloEn: CON_BARRA,
  },
  {
    id: "sillas", tipo: "opciones", texto: "¿Las sillas quién las pone?",
    // Cuántas no se pregunta: salen del pax. A quién se alquilan sí, porque cada
    // proveedor es una recogida distinta y es lo único que la app no puede deducir.
    //
    // En un rodaje TAMBIÉN se pregunta. Antes se daba por supuesto que eran nuestras y
    // ni se preguntaba: el formulario forzaba "Nuestras" al aplicar el envío, así que
    // si en la app habías puesto un alquiler te lo borraba, y con él su recogida.
    nota: "Si las alquilamos, se crea sola su recogida y su devolución.",
    opciones: [
      { valor: "finca", texto: "Las pone el sitio" },
      { valor: "Dealde", texto: "Las alquilamos a Dealde" },
      { valor: "Carvillo", texto: "Las alquilamos a Carvillo" },
      { valor: "Nuestras", texto: "Llevamos las nuestras" },
    ],
    soloEn: [...CON_BARRA, "produccion"],
  },

  {
    id: "tipoMesa", tipo: "opciones", texto: "¿De qué son las mesas donde come la gente?",
    // Cuántas no se pregunta: salen del pax. De qué tipo sí, porque las redondas no son
    // nuestras y cada alquiler es una recogida — y porque entran más comensales por
    // mesa, así que el número cambia.
    //
    // Las de cocina y las de las barras van aparte y son siempre nuestras rectangulares
    // de 1,80: eso no se pregunta porque no cambia nunca.
    nota: "Las redondas son de alquiler: se crea sola su recogida y su devolución. Las de cocina y barras van aparte, siempre de 1,8m.",
    opciones: [
      { valor: "Rectangular 1,8m", texto: "Las nuestras, rectangulares de 1,8m" },
      { valor: "Redonda 1,5m", texto: "Redondas de 1,5m (alquiler)" },
      { valor: "Redonda 1,8m", texto: "Redondas de 1,8m (alquiler)" },
      { valor: "Redonda 2m", texto: "Redondas de 2m (alquiler)" },
    ],
    soloEn: [...CON_BARRA, "produccion"],
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

  {
    // Solo si han dicho el plato principal: si no lo saben, tampoco van a saber el de
    // postre, y sería una pantalla de más.
    id: "estiloPlatoPostre", tipo: "opciones", texto: "¿Y el plato de postre?",
    opciones: [
      { valor: "Blanco", texto: "Blanco" },
      { valor: "Verde", texto: "Verde" },
      { valor: "Negro/gris", texto: "Negro o gris" },
      {
        valor: "Otro", texto: "Otro (escribirlo)",
        conCampos: [{ sufijo: "Cual", etiqueta: "¿Cuál?", ejemplo: "Pizarra, madera..." }],
      },
    ],
    soloEn: CON_BARRA,
    si: (r) => r.estiloPlato !== undefined && r.estiloPlato !== null,
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
    // La mesa de la tarta y sus platos se cargaban SIEMPRE en boda y comunión, hubiera
    // tarta o no; en un cumpleaños no se cargaba mesa ninguna; y la pala y el cuchillo
    // con los que se corta no se cargaban nunca en ningún sitio. Con esta pregunta la
    // mesa va donde hay tarta y no va donde no la hay.
    id: "tarta", tipo: "opciones", texto: "¿Lleva tarta?",
    nota: "Si la lleva, se carga su mesa redonda con la pala y el cuchillo.",
    opciones: [
      { valor: "si", texto: "Sí" },
      { valor: "no", texto: "No lleva" },
    ],
    soloEn: ["boda", "comunion", "corporativo", "cumpleanos"],
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
    // Las alergias iban dentro del cajón de "algo que tener en cuenta", entre la
    // petición del cliente y con quién hablar al llegar. Ahí se leen en diagonal y se
    // pierden, y son lo único de todo el formulario que puede acabar en un disgusto de
    // verdad. Con pantalla propia se contestan mirándolas.
    id: "alergias", tipo: "texto-largo", texto: "¿Hay alergias o intolerancias?",
    campo: "alergias",
    nota: "Cuántos comensales y de qué, si se sabe. Si no hay ninguna, se deja en blanco y se pasa.",
    ejemplo: "Ej: 2 celíacos, 1 alérgico al marisco en la mesa 4, 1 vegano...",
    noSe: false,
  },
  {
    id: "notas", tipo: "texto-largo", texto: "¿Algo más que haya que tener en cuenta?",
    campo: "notas",
    // Aquí acaba todo lo que no tiene pregunta propia. Se dicen ejemplos de verdad
    // porque un campo libre sin ejemplos se queda en blanco: alguna bebida suelta que
    // haya que añadir, o con quién hablar al llegar. Las alergias ya no salen en los
    // ejemplos: tienen su propia pantalla justo antes.
    nota: "Peticiones del cliente, alguna bebida que haya que añadir, con quién hablar en el sitio...",
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
    // Con su número si lo lleva: "Algo frito (3)" dice lo que hay que cargar, "Algo
    // frito" a secas no, y esto es lo último que se lee antes de darle a enviar.
    return opcionesDe(p, tipo).filter(o => v.includes(o.valor)).map(o => {
      const n = o.conNumero ? r[o.campoNumero || `${o.valor}Numero`] : null;
      return n ? `${o.texto} (${n})` : o.texto;
    }).join(", ");
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
  // Y las que llevan un número: en el repaso salía "Sí" a secas y no se veía si eran
  // 3 carpas o 11, que es justo lo que hay que repasar antes de mandarlo.
  if (op.conNumero) {
    const n = r[op.campoNumero || `${op.valor}Numero`];
    if (n) extra.push(String(n));
  }
  return extra.length ? `${op.texto} · ${extra.join(" · ")}` : op.texto;
}

// Cómo llamar a un envío en un aviso o en la bandeja: el evento al que ya está
// asociado si lo tiene, si no el nombre que puso quien rellenó el formulario, y si
// tampoco hay eso, un texto genérico — nunca vacío.
export function nombreDelEnvio(e) {
  return e.eventoDestino || (e.respuestas && e.respuestas.nombre) || "evento nuevo";
}

// El texto del aviso de WhatsApp cuando llega un envío nuevo o corregido: qué ha
// cambiado, y un resumen corto de quién/cuándo para reconocerlo sin abrir la bandeja.
export function textoAvisoEnvio(e) {
  const r = e.respuestas || {};
  const trozos = [];
  if (r.fecha) trozos.push(fmtFechaCorta(r.fecha));
  if (r.sitio) trozos.push(r.sitio);
  const gente = [r.adultos && `${r.adultos} adultos`, r.ninos && `${r.ninos} niños`, r.staff && `${r.staff} staff`]
    .filter(Boolean).join(" + ");
  if (gente) trozos.push(gente);
  const cabecera = e.corregido
    ? `Han CAMBIADO los datos de "${nombreDelEnvio(e)}"`
    : `Datos nuevos de "${nombreDelEnvio(e)}"`;
  return `${cabecera}${trozos.length ? `\n${trozos.join(" · ")}` : ""}\nEstá en el formulario, sin aplicar todavía.`;
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
  // Las alergias van las primeras y marcadas dentro de las notas del evento, no en un
  // campo aparte: así salen solas en la hoja, en el Word y en el texto de WhatsApp, que
  // es por donde le llegan a quien está en el sitio. Y van arriba porque una alergia
  // leída después de servir no sirve de nada.
  const alergias = (r.alergias || "").trim();
  const otras = (r.notas || "").trim();
  // Comentario libre por pregunta (id + "_comentario", puesto desde ComentarioPregunta
  // en Formulario.jsx): cada uno se anexa como una línea propia, con el texto de la
  // pregunta delante para no perder de vista a qué aclara. notasFusionadas (en
  // App.jsx, al aplicar el envío) ya compara línea a línea, así que reenviar el
  // formulario sin cambiar un comentario no lo duplica.
  const comentarios = preguntasDe(tipo, r)
    .map(p => ({ texto: p.texto, valor: (r[`${p.id}_comentario`] || "").trim() }))
    .filter(x => x.valor)
    .map(x => `· ${x.texto} ${x.valor}`);
  const juntas = [alergias ? `⚠️ ALERGIAS: ${alergias}` : "", otras, ...comentarios].filter(Boolean).join("\n");
  pon("notasEvento", juntas);

  // Café para invitados por defecto (estadoInicial.cafeParaInvitados ?? true en
  // calcCafe): así ningún evento guardado antes de esta pregunta cambia de cantidad.
  if (puesto(r.cafe)) estado.cafeParaInvitados = r.cafe !== "personal";

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
    if (puesto(r.aguaPequena)) estado.tipoAguaPequena = r.aguaPequena;
    // Las sillas de un rodaje se preguntan igual que en el resto. Antes se forzaban a
    // "Nuestras" sin preguntar, y eso PISABA lo que hubiera en la app: si tenías un
    // alquiler puesto, aplicar el envío te lo borraba junto con su recogida. Sin
    // contestar no se toca nada, como todo lo demás del formulario.
    if (puesto(r.sillas)) estado.origenSillas = r.sillas === "finca" ? "No llevan" : r.sillas;
    if (puesto(r.tipoMesa)) estado.tipoMesa = r.tipoMesa;
  } else {
    pon("pax", r.adultos);
    pon("ninos", r.ninos);
    pon("numStaff", r.staff);
    if (puesto(r.coctel)) { estado.barraCoctel = r.coctel > 0; estado.horasCoctel = r.coctel || 0; }
    if (puesto(r.copas)) { estado.barraCopas = r.copas > 0; estado.horasCopas = r.copas || 0; }
    if (puesto(r.servicio)) {
      estado.soloBandeja = r.servicio === "bandeja";
      // De pie se sirve con muchos menos camareros que un banquete sentado: el sector
      // da 1 cada 25-30 para cóctel de pie y 1 cada 12-15 sentado. Iba a 18, que para
      // 100 personas son seis camareros donde se ponen tres o cuatro.
      estado.paxPorCamarero = r.servicio === "bandeja" ? 25 : 12;
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
    if (puesto(r.armarioCaliente)) estado.llevaArmarioCaliente = r.armarioCaliente === "si";
    if (puesto(r.sillas)) estado.origenSillas = r.sillas === "finca" ? "No llevan" : r.sillas;
    if (puesto(r.tipoMesa)) estado.tipoMesa = r.tipoMesa;
    if (Array.isArray(r.extras)) {
      estado.tieneBrindisCava = marcado("extras", "brindis");
      estado.tipoBBQ = marcado("extras", "barbacoa") ? "Grande" : "No lleva";
      estado.llevaMobiliarioAlquiler = marcado("extras", "mobiliario");
      estado.hayDesayuno = marcado("extras", "desayuno");
      estado.tamanoBarril = marcado("extras", "barril50") ? "50L"
        : marcado("extras", "barril30") ? "30L" : "No lleva";
      if (estado.tamanoBarril !== "No lleva" && r.numBarriles > 0) estado.numBarriles = r.numBarriles;
      estado.llevaJarrasCristal = marcado("extras", "jarras");
    }
  }

  // Lo que se sale de lo normal. Va fuera del reparto rodaje/banquete porque los platos,
  // los cubiertos y las bandejas los carga también un rodaje.
  //
  // Solo se toca si la pantalla se ha contestado: sin contestar, la app se queda con lo
  // que ya tuviera, igual que el resto del formulario. Marcar la casilla es decir "esto
  // NO va", así que se niega.
  if (Array.isArray(r.distinto)) {
    estado.llevaPlatos = !marcado("distinto", "sinPlatos");
    // Los de postre pueden quitarse aparte, pero si no van los platos tampoco van estos:
    // servir postre en plato cuando no se llevan platos no existe.
    estado.llevaPlatosPostre = estado.llevaPlatos && !marcado("distinto", "sinPlatosPostre");
    estado.llevaCubiertos = !marcado("distinto", "sinCubiertos");
    if (tipo !== "produccion") {
      estado.llevaPlanchaGas = marcado("distinto", "planchaGas");
      if (estado.llevaPlanchaGas && r.numPlanchasGas > 0) estado.numPlanchasGas = r.numPlanchasGas;
    }
    // Una sola marcada manda; ninguna o las dos = de los dos tipos, que es lo normal
    const soloMadera = marcado("distinto", "bandejasMadera");
    const soloPlata = marcado("distinto", "bandejasPlata");
    estado.tipoBandejas = soloMadera && !soloPlata ? "Madera"
      : soloPlata && !soloMadera ? "Plata" : "Mixto";
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
  if (puesto(r.estiloPlatoPostre)) {
    const suyo = (r.estiloPlatoPostreCual || "").trim();
    if (r.estiloPlatoPostre !== "Otro") estado.estiloPlatoPostre = r.estiloPlatoPostre;
    else if (suyo) estado.estiloPlatoPostre = suyo;
  }
  if (puesto(r.horno)) estado.tipoHorno = r.horno;
  if (puesto(r.nevera)) estado.tipoNevera = r.nevera;
  if (puesto(r.congelador)) estado.tipoCongelador = r.congelador;
  if (Array.isArray(r.menu)) {
    estado.llevaPaella = marcado("menu", "paella");
    estado.tieneFrituras = marcado("menu", "frito");
    if (estado.tieneFrituras && r.numFrituras > 0) estado.numFrituras = r.numFrituras;
    estado.llevaJamonero = marcado("menu", "jamonero");
    if (tipo !== "produccion") estado.dobleServicio = marcado("menu", "dosPlatos");
  }
  // Talla y número de paellas. "Auto" y "las que salgan por la gente" son respuestas de
  // verdad: dicen "déjalo como lo calcula la app", y por eso se escriben (Auto y 0) en
  // vez de no tocar nada — si el evento traía una talla puesta a mano y ahora dicen que
  // vale la de siempre, hay que quitarla.
  // Si la lleva, la app carga su mesa redonda, los platos, la pala y el cuchillo.
  if (puesto(r.tarta)) estado.llevaTarta = r.tarta === "si";
  if (puesto(r.tamanoPaella)) estado.tipoPaella = r.tamanoPaella;
  if (puesto(r.cuantasPaellas)) {
    estado.numPaellas = r.cuantasPaellas === "otras" && r.numPaellas > 0 ? r.numPaellas : 0;
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
function camposSinContestar(r = {}, tipo = "boda") {
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
export function respuestasQueFaltan(respuestas = {}) {
  const tipo = respuestas.tipo || "boda";
  return preguntasDe(tipo, respuestas)
    .map(p => ({ id: p.id, aviso: p.falta ? p.falta(respuestas) : "" }))
    .filter(x => !!x.aviso);
}

// Las notas del evento, al aplicar un envío: se SUMAN, no se sustituyen — las que ya
// hubiera suelen ser tuyas (a quién llamar, qué recoger) y las del formulario vienen
// del cliente. Perder unas por las otras es justo lo que no puede pasar.
//
// Se compara LÍNEA A LÍNEA, no el bloque entero: la oficina, al corregir el
// formulario, normalmente no borra lo que ya había escrito — lo deja tal cual y añade
// algo detrás. Eso deja "nuevas" con una copia completa de "antes" dentro, más lo
// añadido. Comparando el bloque entero el texto viejo, más corto, nunca puede
// "incluir" al nuevo, más largo con la copia dentro — así que se concatenaba OTRA VEZ:
// viejo, viejo, y lo nuevo. Y como ModalModoCarga.jsx convierte cada línea de las
// notas en un recordatorio con su propio check ("Recordatorios del evento"), ese
// texto duplicado salía como filas duplicadas en Modo carga.
export function notasFusionadas(antes, nuevas) {
  const a = String(antes || "").trim();
  const n = String(nuevas || "").trim();
  if (!a) return n;
  if (!n) return a;
  const lineasAntes = a.split("\n").map(l => l.trim()).filter(Boolean);
  const lineasNuevas = n.split("\n").map(l => l.trim()).filter(Boolean)
    .filter(l => !lineasAntes.some(x => x.toLowerCase() === l.toLowerCase()));
  return lineasNuevas.length ? `${a}\n${lineasNuevas.join("\n")}` : a;
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
