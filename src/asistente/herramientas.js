// ─── LO QUE EL ASISTENTE PUEDE HACER ──────────────────────────────────────────
// Un modelo de lenguaje no sabe nada de esta app. Lo único que sabe es pedir cosas por
// su nombre, y estas son las cosas que puede pedir. Cada herramienta es una función
// normal que se ejecuta AQUÍ, en el navegador, con los datos que ya tiene la app: el
// modelo no toca Firestore ni ve la base de datos, pide y se le contesta.
//
// Esa es toda la seguridad del asunto, y por eso está escrita así:
//
//   · Las que escriben (tareas, apuntes del calendario, calibraciones) llevan
//     escribe: true y las gobierna permisos.js: en "Solo consultar" ni se
//     ofrecen, en "Con permiso" se proponen y se aprueban, en "Confianza" se
//     aplican y se cuentan. Y hay una lista que no se expone en NINGUN nivel
//     (ver NUNCA en permisos.js): marcar cargado, preparado o vuelto, roturas,
//     renombrar item o categoría, borrar evento o archivo. La identidad de un
//     item es "categoría::etiqueta"; tocarla destruye el trabajo de quien está
//     cargando el camión, que es lo único que esta app no puede permitirse perder.
//
//   · Cada una dice si sus datos son SENSIBLES. Las que devuelven nombres de clientes,
//     fechas o sitios llevan datos: true, y el cliente se niega a mandarlas a un
//     proveedor que entrene con lo que le llega (ver cliente.js). Calcular hielo para
//     100 personas no tiene dueño; "la boda de Fulanita el 12 de septiembre" sí.
//
// No importa React ni la nube: entran datos, sale un resultado. Se prueba con node.
import { sinTildes } from "../texto.js";
import { hoyISO, enDiasISO } from "../fecha.js";

import { calcBebidas, calcHielo, KG_HIELO_POR_PAX } from "../calculos.js";
import { buildChecklist } from "../checklist-generadores.js";
import { escaletaDelEvento, resumenEscaleta } from "../escaleta.js";
import { menusEspeciales, alergiasDeLasNotas } from "../menus-especiales.js";
import { personalNecesario, leerRatios } from "../personal.js";
import { catsDeEventoGuardado } from "../calibracion.js";
import { RATIOS_BEBIDA } from "../bebida.js";
import { PERSONAS_POR_PAELLA } from "../paella.js";
import { compararRatios } from "./sector.js";
import { TEMAS, CLAVES_TEMA, porTemas } from "./memoria.js";
import { conHerramientasDeConectores } from "./conectores.js";
import { puede as permiteNivel, NIVEL_POR_DEFECTO } from "./permisos.js";
import { esTipoEvento } from "../calendario/apuntes.js";
import { revisarEvento, revisarProximos } from "./revision.js";
import { porEvento as tareasPorEvento, sinHacer } from "./tareas.js";
// Los conectores se registran al importarse. Van aquí y no en cada sitio que los use:
// así basta con añadir una línea para que una integración nueva exista en toda la app.
import "./conectores/whatsapp.js";
import "./conectores/correo.js";
import "./conectores/calendario.js";
import "./conectores/checklists.js";

// Los nombres se comparan sin tildes, sin mayúsculas y sin sobrar espacios: quien
// pregunta escribe "la boda de fulanita", no "Boda Fulanita y Mengano".
const normaliza = (t) => sinTildes(t).trim();

// Cuánto se parece un nombre a lo que se ha preguntado. No es una búsqueda difusa de
// verdad: basta con que todas las palabras de la pregunta estén en el nombre, que es
// como se busca un evento cuando se recuerda a medias.
function coincide(nombre, busca) {
  const n = normaliza(nombre);
  const palabras = normaliza(busca).split(/\s+/).filter(Boolean);
  if (!palabras.length) return 0;
  const dentro = palabras.filter(p => n.includes(p)).length;
  return dentro === palabras.length ? dentro / palabras.length + (n === normaliza(busca) ? 1 : 0) : 0;
}

// El evento que se está pidiendo. Sin nombre devuelve el que está abierto: "¿cuánto
// hielo llevo?" casi siempre se pregunta con el evento delante.
//
// Con nombre, devuelve lo encontrado — o lo que hay que resolver ANTES de
// encontrarlo: dos candidatos empatados al top no se adivinan. Adivinar entre dos
// "Boda García" es jugársela con los datos de alguien; el conector de calendario ya
// lo hacía ("Hay X que se parecen… dime cuál"), y esto lo iguala. Un empate en la
// primera posición es ambigüedad; un nombre EXACTO (puntos 2) no lo es: es EL
// nombre, no uno parecido.
function buscaEvento(ctx, nombre) {
  const archivo = ctx.eventosGuardados || {};
  if (!nombre || !String(nombre).trim()) {
    return ctx.eventoActual ? { nombre: ctx.eventoActual.nombreEvento || "(sin nombre)", datos: ctx.eventoActual } : null;
  }
  const candidatos = Object.entries(archivo)
    .map(([n, d]) => ({ nombre: n, datos: d, puntos: coincide(n, nombre) }))
    .filter(c => c.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
  if (!candidatos.length) return null;
  const [primero, segundo] = candidatos;
  if (segundo && primero.puntos < 2 && segundo.puntos === primero.puntos) {
    return { error: `Hay ${candidatos.length} que se parecen a "${nombre}": ${candidatos.slice(0, 3).map(c => c.nombre).join(", ")}. Dime cuál con más detalle.` };
  }
  return primero;
}

const noEncontrado = (nombre) => ({
  error: nombre
    ? `No hay ningún evento que se llame así ("${nombre}"). Prueba con buscar_eventos para ver los que hay.`
    : "No hay ningún evento abierto ahora mismo. Dime el nombre de uno.",
});

// Solo lo que se puede enseñar de un evento. Se elige a mano y no se manda el objeto
// entero: dentro hay checks de carga, marcas y notas internas que no pintan nada en una
// respuesta y que solo servirían para gastar tokens y enseñar de más.
function resumeEvento(nombre, e) {
  const alergias = menusEspeciales(alergiasDeLasNotas(e.notasEvento || ""));
  return {
    nombre,
    tipo: e.evento || "",
    fecha: e.fechaEvento || "",
    hora: e.horaInicio || "",
    sitio: e.ubicacion || "",
    adultos: e.pax || 0,
    ninos: e.ninos || 0,
    barraCoctel: e.barraCoctel ? e.horasCoctel || 0 : 0,
    barraCopas: e.barraCopas ? e.horasCopas || 0 : 0,
    menusEspeciales: alergias.length ? alergias.map(m => `${m.n} × ${m.label}`) : [],
    sinConfigurar: !!e.sinConfigurar,
  };
}

// ─── EL CATÁLOGO ──────────────────────────────────────────────────────────────
// "esquema" es lo que se le manda al modelo para que sepa qué puede pedir y con qué.
// "corre" es lo que pasa de verdad. "datos" marca si la respuesta lleva información de
// clientes: eso decide a qué proveedor se le puede preguntar.
export const HERRAMIENTAS = {
  buscar_eventos: {
    datos: true,
    esquema: {
      description: "Lista los eventos GUARDADOS de la checklist (el archivo de esta app, no la agenda del equipo), filtrando por texto (nombre, sitio) o por fecha. Úsalo cuando no sepas el nombre exacto de un evento. Sin desde/hasta salen TODOS, pasados incluidos: para \"los próximos\" o \"qué viene\" pasa desde con la fecha de hoy, o mejor usa ver_calendario, que es la agenda de verdad del equipo.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Parte del nombre o del sitio. Vacío para verlos todos." },
          desde: { type: "string", description: "Fecha mínima, AAAA-MM-DD." },
          hasta: { type: "string", description: "Fecha máxima, AAAA-MM-DD." },
        },
      },
    },
    corre: (ctx, { texto = "", desde = "", hasta = "" } = {}) => {
      const lista = Object.entries(ctx.eventosGuardados || {})
        .filter(([n, e]) => !texto || coincide(n, texto) > 0 || coincide(e.ubicacion || "", texto) > 0)
        .filter(([, e]) => (!desde || (e.fechaEvento || "") >= desde) && (!hasta || (e.fechaEvento || "") <= hasta))
        .map(([n, e]) => ({ nombre: n, tipo: e.evento || "", fecha: e.fechaEvento || "", sitio: e.ubicacion || "", pax: (e.pax || 0) + (e.ninos || 0), sinConfigurar: !!e.sinConfigurar }))
        .sort((a, b) => (a.fecha || "9").localeCompare(b.fecha || "9"));
      return { total: lista.length, eventos: lista.slice(0, 40) };
    },
  },

  ver_evento: {
    datos: true,
    esquema: {
      description: "Los datos de un evento: tipo, fecha, hora, sitio, comensales, horas de barra y menús especiales por alergias. Sin nombre, el evento que está abierto.",
      parameters: { type: "object", properties: { nombre: { type: "string", description: "Nombre del evento." } } },
    },
    corre: (ctx, { nombre = "" } = {}) => {
      const ev = buscaEvento(ctx, nombre);
      if (ev && ev.error) return ev;   // empatados: se listan y se pide, no se adivina
      return ev ? resumeEvento(ev.nombre, ev.datos) : noEncontrado(nombre);
    },
  },

  ver_checklist: {
    datos: true,
    esquema: {
      description: "Lo que hay que cargar en un evento, con cantidades. Se puede pedir una categoría suelta (por ejemplo 'bebidas') para no traerlo todo.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre del evento. Vacío para el que está abierto." },
          categoria: { type: "string", description: "Parte del nombre de una categoría. Vacío para todas." },
        },
      },
    },
    corre: (ctx, { nombre = "", categoria = "" } = {}) => {
      const ev = buscaEvento(ctx, nombre);
      if (ev && ev.error) return ev;   // empatados: se listan y se pide, no se adivina
      if (!ev) return noEncontrado(nombre);
      let cats;
      try { cats = catsDeEventoGuardado(ev.datos); } catch (e) { return { error: "No he podido reconstruir esa checklist." }; }
      const filtradas = cats
        .filter(c => !categoria || normaliza(c.nombre).includes(normaliza(categoria)))
        .map(c => ({
          categoria: c.nombre,
          items: c.items.filter(Boolean)
            .filter(it => it[1] !== null && it[1] !== undefined)
            .map(it => `${it[0]}: ${it[1] && it[1].u ? `${it[1].u} ${it[1].sufijo || ""}`.trim() : it[1]}`),
        }))
        .filter(c => c.items.length);
      if (!filtradas.length) {
        return { error: `Ese evento no tiene ninguna categoría que se parezca a "${categoria}". Las que hay: ${cats.map(c => c.nombre).join(", ")}.` };
      }
      return { evento: ev.nombre, categorias: filtradas };
    },
  },

  // Sin nombre a propósito: solo tiene sentido para el evento que se tiene delante EN
  // ESTE MOMENTO, con el móvil en una mano cargando el camión — preguntar por el
  // progreso de otro evento no significa nada, nadie está cargando dos camiones a la
  // vez. Los números vienen ya calculados de la app (ctx.progresoCarga, ver
  // contexto.js): no se recalculan aquí reconstruyendo la checklist desde lo guardado,
  // porque eso podría no coincidir con lo que se ve en pantalla si hay categorías o
  // items renombrados a mano, que vive solo en este navegador.
  progreso_carga: {
    datos: false,
    esquema: {
      description: "Cuánto llevas cargado, preparado y vuelto del evento que tienes abierto ahora mismo, en número de items y en porcentaje. Para \"cuánto me queda\", \"cómo voy\", \"qué falta por cargar\". Solo vale para el evento delante; no admite nombre.",
      parameters: { type: "object", properties: {} },
    },
    corre: (ctx) => {
      const p = ctx.progresoCarga;
      if (!p || !p.total) return { error: "No hay ninguna checklist con items abierta ahora mismo." };
      const pct = (n) => Math.round((n / p.total) * 100);
      return {
        total: p.total,
        preparados: p.preparados, porcentajePreparado: pct(p.preparados),
        cargados: p.cargados, porcentajeCargado: pct(p.cargados),
        vueltos: p.vueltos, porcentajeVuelto: pct(p.vueltos),
      };
    },
  },

  ver_escaleta: {
    datos: true,
    esquema: {
      description: "A qué hora toca cada cosa el día del evento: salir del obrador, cargar, montar, el servicio y la recogida.",
      parameters: { type: "object", properties: { nombre: { type: "string", description: "Nombre del evento." } } },
    },
    corre: (ctx, { nombre = "" } = {}) => {
      const ev = buscaEvento(ctx, nombre);
      if (ev && ev.error) return ev;   // empatados: se listan y se pide, no se adivina
      if (!ev) return noEncontrado(nombre);
      const e = ev.datos;
      let totalItems = 0;
      try {
        totalItems = catsDeEventoGuardado(e).reduce((a, c) => a + c.items.filter(it => it && it[1] != null).length, 0);
      } catch (err) { /* sin checklist reconstruible se estima solo con el pax */ }
      const logistica = (e.logisticaEquipo || []).filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin);
      const tramos = escaletaDelEvento({
        horaInicio: e.horaInicio,
        horasCoctel: e.barraCoctel ? e.horasCoctel || 0 : 0,
        horasCopas: e.barraCopas ? e.horasCopas || 0 : 0,
        totalItems, pax: (e.pax || 0) + (e.ninos || 0),
        numLogistica: logistica.length || 1,
        logisticaEquipo: logistica,
      });
      if (!tramos.length) return { error: `"${ev.nombre}" no tiene hora de inicio puesta, así que no hay escaleta. Ponla en el evento y vuelve a preguntar.` };
      return {
        evento: ev.nombre,
        resumen: resumenEscaleta(tramos),
        tramos: tramos.map(t => ({ hora: t.hora, hasta: t.fin, que: t.titulo, minutos: t.minutos, aOjo: !!t.estimado })),
        avisoLogistica: tramos[0] && tramos[0].desfaseMin > 15
          ? `El equipo entra a las ${tramos[0].horaDecidida} y la cuenta pide empezar a las ${tramos[0].hora}.`
          : "",
      };
    },
  },

  calcular_bebida: {
    // Sin dueño: son números por comensal, no dicen de quién es el evento.
    datos: false,
    esquema: {
      description: "Cuánta bebida hace falta para un número de comensales, con las fórmulas reales de la casa. No mira ningún evento: se le dan los números y calcula.",
      parameters: {
        type: "object",
        properties: {
          adultos: { type: "number", description: "Comensales adultos." },
          ninos: { type: "number", description: "Niños (beben agua y refresco, no alcohol)." },
          horasCoctel: { type: "number", description: "Horas de barra de cóctel/aperitivo." },
          horasCopas: { type: "number", description: "Horas de barra de copas." },
          verano: { type: "boolean", description: "Si el evento cae en meses cálidos." },
          hayCongelador: { type: "boolean", description: "Si en el sitio hay arca o congelador donde guardar el hielo." },
          brindisCava: { type: "boolean", description: "Si hay brindis con cava." },
          tipo: { type: "string", description: "boda, comunion, corporativo, cumpleanos o produccion." },
        },
        required: ["adultos"],
      },
    },
    corre: (ctx, { adultos = 0, ninos = 0, horasCoctel = 0, horasCopas = 0, verano = false, hayCongelador = false, brindisCava = false, tipo = "" } = {}) => {
      const a = Math.max(0, Math.round(adultos) || 0);
      if (!a) return { error: "Hacen falta los comensales adultos para calcular nada." };
      const n = Math.max(0, Math.round(ninos) || 0);
      const total = a + n;
      const h = (Number(horasCoctel) || 0) + (Number(horasCopas) || 0);
      const b = calcBebidas(total, h, !!verano, !!hayCongelador, !!brindisCava, Number(horasCopas) || 0, { alcoholPax: a, tipo });
      return { paraQuien: `${a} adultos y ${n} niños`, bebida: b };
    },
  },

  calcular_hielo: {
    datos: false,
    esquema: {
      description: "Los kilos, bolsas y sacas de hielo que hacen falta. Depende de la temporada, de si hay barra y de si en el sitio hay congelador donde guardarlo. Pasa 'tipo' para que salga el mismo número que la checklist (aplicado el factor que el equipo tenga medido para ese tipo).",
      parameters: {
        type: "object",
        properties: {
          comensales: { type: "number", description: "Comensales totales, niños incluidos." },
          verano: { type: "boolean" },
          horasBarra: { type: "number", description: "Horas de barra en total. 0 si no hay." },
          hayCongelador: { type: "boolean" },
          tipo: { type: "string", description: "boda, comunion, corporativo, cumpleanos o produccion. Vacío si no se sabe." },
        },
        required: ["comensales"],
      },
    },
    corre: (ctx, { comensales = 0, verano = false, horasBarra = 0, hayCongelador = false, tipo = "" } = {}) => {
      const n = Math.max(0, Math.round(comensales) || 0);
      if (!n) return { error: "Hacen falta los comensales." };
      return calcHielo(n, { mesVerano: !!verano, horasBarra: Number(horasBarra) || 0, tieneCongelador: !!hayCongelador, tipo: String(tipo) });
    },
  },

  calcular_personal: {
    datos: false,
    esquema: {
      description: "Cuánta gente hace falta (sala, cocina y logística) para un evento de un tipo y un número de comensales.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", description: "boda, comunion, corporativo, cumpleanos o produccion." },
          comensales: { type: "number" },
        },
        required: ["tipo", "comensales"],
      },
    },
    corre: (ctx, { tipo = "boda", comensales = 0 } = {}) => {
      const n = Math.max(0, Math.round(comensales) || 0);
      if (!n) return { error: "Hacen falta los comensales." };
      return personalNecesario(tipo, n);
    },
  },

  // Sin dueño: compara ratios generales de la casa (no de ningún evento) contra bandas
  // públicas del sector. El delta y la banda salen SIEMPRE de sector.js, nunca de la
  // cabeza del modelo — es la misma regla de oro que el resto de herramientas.
  comparar_con_sector: {
    datos: false,
    esquema: {
      description: "Compara los ratios propios de la casa (camareros, vino, cerveza, cava, hielo, paella) contra bandas públicas del sector de catering/eventos, para saber si un número está dentro de lo normal, por encima o por debajo. OJO: los ratios medidos con eventos reales (camareros de boda/comunión, hielo, bebida) pueden estar fuera de la banda A PROPÓSITO — no es un fallo, es cómo se trabaja aquí, y ese motivo suele estar comentado en el propio fichero del ratio. Sirve sobre todo para lo que NADIE ha medido todavía (paella, cumpleaños, producción): ahí el sector es la única referencia que hay. Los números del sector son de fuentes públicas, sin validar contra el equipo — dilo si alguien pregunta por su fiabilidad.",
      parameters: {
        type: "object",
        properties: {
          ratio: { type: "string", description: "Parte del nombre de un ratio concreto (por ejemplo 'paella' o 'hielo'). Vacío para compararlos todos." },
        },
      },
    },
    corre: (ctx, { ratio = "" } = {}) => {
      const ratiosCamareros = leerRatios();
      const actuales = {
        camareros_banquete: ratiosCamareros.boda,
        camareros_corporativo: ratiosCamareros.corporativo,
        vino: RATIOS_BEBIDA.vino,
        cerveza_verano: RATIOS_BEBIDA.cerveza.verano,
        cava: RATIOS_BEBIDA.cava,
        hielo_verano: KG_HIELO_POR_PAX.verano,
        hielo_invierno: KG_HIELO_POR_PAX.invierno,
        paella: PERSONAS_POR_PAELLA,
      };
      const comparados = compararRatios(actuales)
        .filter(r => !ratio || normaliza(r.nombre).includes(normaliza(ratio)) || normaliza(r.id).includes(normaliza(ratio)));
      if (!comparados.length) return { error: `No hay ningún ratio del sector que se parezca a "${ratio}".` };
      return { ratios: comparados };
    },
  },

  ver_calendario: {
    datos: true,
    esquema: {
      description: "La agenda de verdad del equipo en un rango de fechas: qué hay, cuándo y dónde. Es la herramienta para \"qué hay próximo\", \"qué toca esta semana\", \"qué eventos vienen\" — no buscar_eventos, que es el archivo de checklists guardadas y no filtra por fecha si no se lo pides. Sin desde/hasta no acota nada: pásalos siempre que la pregunta sea relativa a hoy.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: "string", description: "AAAA-MM-DD." },
          hasta: { type: "string", description: "AAAA-MM-DD." },
        },
      },
    },
    corre: (ctx, { desde = "", hasta = "" } = {}) => {
      const apuntes = (ctx.apuntes || [])
        .filter(a => a && (!desde || (a.fecha || "") >= desde) && (!hasta || (a.fecha || "") <= hasta))
        .map(a => ({ fecha: a.fecha || "", titulo: a.titulo || "", tipo: a.tipo || "", sitio: a.sitio || "", pax: a.pax || 0, tieneChecklist: !!a.evento }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      return { total: apuntes.length, apuntes: apuntes.slice(0, 60) };
    },
  },


  // ─── EL CEREBRO ─────────────────────────────────────────────────────────────
  // Las dos únicas herramientas que ESCRIBEN, y escriben en un sitio que no le hace
  // daño a nadie: su propia memoria. No tocan eventos, ni checklists, ni marcas de
  // carga. Lo peor que puede pasar con ellas es que recuerde una tontería, y para eso
  // está el panel del cerebro, donde se lee y se borra a mano.
  recordar: {
    datos: true,
    esquema: {
      description: "Guarda algo que has aprendido del equipo y que no está en ningún cálculo: cómo trabajan, qué pasa en una finca, qué prefiere un cliente. Úsalo cuando te corrijan o te cuenten algo que servirá en el próximo evento. Una frase corta y concreta, en tercera persona.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Lo aprendido, en una frase. Ej: 'En la finca X no hay enchufe en la carpa, hay que llevar generador'." },
          tema: { type: "string", description: `Uno de: ${CLAVES_TEMA.join(", ")}.` },
        },
        required: ["texto"],
      },
    },
    corre: (ctx, { texto = "", tema = "general" } = {}) => {
      if (!String(texto).trim()) return { error: "No me has dicho qué recordar." };
      if (!ctx.onRecordar) return { error: "El cerebro no está disponible ahora mismo." };
      const r = ctx.onRecordar(String(texto), String(tema));
      return r && r.recuerdo
        ? { guardado: r.recuerdo.texto, tema: TEMAS[r.recuerdo.tema], yaLoSabia: !!r.fundido }
        : { error: "No he podido guardarlo." };
    },
  },

  olvidar: {
    datos: true,
    esquema: {
      description: "Borra algo que habías aprendido, cuando resulta que era falso o ha dejado de valer. Hace falta el texto exacto o casi.",
      parameters: { type: "object", properties: { texto: { type: "string", description: "El recuerdo a borrar." } }, required: ["texto"] },
    },
    corre: (ctx, { texto = "" } = {}) => {
      if (!ctx.onOlvidar) return { error: "El cerebro no está disponible ahora mismo." };
      const encontrado = (ctx.memoria || []).find(r => normaliza(r.texto).includes(normaliza(texto)) || normaliza(texto).includes(normaliza(r.texto)));
      if (!encontrado) return { error: `No recuerdo nada parecido a "${texto}".` };
      ctx.onOlvidar(encontrado.id);
      return { olvidado: encontrado.texto };
    },
  },

  ver_cerebro: {
    datos: true,
    esquema: {
      description: "Todo lo que has aprendido del equipo hasta ahora, por temas. Úsalo si te preguntan qué sabes o qué recuerdas.",
      parameters: { type: "object", properties: { tema: { type: "string", description: `Uno de: ${CLAVES_TEMA.join(", ")}. Vacío para todos.` } } },
    },
    corre: (ctx, { tema = "" } = {}) => {
      const grupos = porTemas(ctx.memoria || [])
        .filter(g => !tema || g.tema === tema)
        .map(g => ({ tema: g.titulo, recuerdos: g.recuerdos.map(r => r.texto) }));
      return grupos.length ? { grupos } : { vacio: "Todavía no he aprendido nada. Cuéntame cosas y las guardo." };
    },
  },

  // ─── EL REPASO ──────────────────────────────────────────────────────────────
  // El equivalente del "subconscious loop" de OpenHuman, pero sin bucle: en vez de un
  // proceso dando vueltas por detrás, se contesta cuando alguien pregunta. Lo que hace
  // falta es el DATO —qué está a medias y qué se acerca—, no que lo calcule solo a las
  // seis de la mañana.
  que_falta: {
    datos: true,
    esquema: {
      description: "El repaso: qué eventos se acercan, cuáles están sin configurar, a cuáles les falta la hora o el sitio. Úsalo cuando pregunten '¿qué tengo pendiente?' o '¿cómo va la semana?'.",
      parameters: { type: "object", properties: { dias: { type: "number", description: "Cuántos días mirar hacia delante. Por defecto 30." } } },
    },
    corre: (ctx, { dias = 30 } = {}) => {
      const hoy = hoyISO();
      const limite = enDiasISO(Math.max(1, Math.round(dias) || 30));
      const proximos = Object.entries(ctx.eventosGuardados || {})
        .filter(([, e]) => (e.fechaEvento || "") >= hoy && (e.fechaEvento || "") <= limite)
        .sort((a, b) => (a[1].fechaEvento || "").localeCompare(b[1].fechaEvento || ""));

      const pendientes = proximos.map(([nombre, e]) => {
        const falta = [];
        if (e.sinConfigurar) falta.push("está recién creado del calendario, sin configurar");
        if (!e.horaInicio) falta.push("sin hora de inicio (no hay escaleta)");
        if (!e.ubicacion) falta.push("sin sitio");
        if (!e.pax) falta.push("sin comensales");
        if (!(e.logisticaEquipo || []).some(p => p && p.nombre && p.nombre.trim())) falta.push("sin equipo de logística asignado");
        return { evento: nombre, fecha: e.fechaEvento || "", falta };
      });

      // Apuntes del calendario que se acercan y todavía no tienen checklist: es el hueco
      // por el que un evento desaparece del desplegable de la oficina.
      //
      // Solo los que SON un evento. Las vacaciones, los días cerrados, las tareas y los
      // "recoger el camión" no llevan checklist ni la van a llevar nunca, y salían todos
      // en la lista de pendientes: el repaso enseñaba diez líneas de las que ocho no
      // había que hacer nada, que es la forma de que nadie vuelva a mirarlo. Se vio a la
      // primera pregunta de verdad, con el calendario real delante.
      const sinChecklist = (ctx.apuntes || [])
        .filter(a => a && !a.evento && esTipoEvento(a.tipo) && (a.fecha || "") >= hoy && (a.fecha || "") <= limite)
        .map(a => ({ fecha: a.fecha, titulo: a.titulo, tipo: a.tipo }));

      return {
        desde: hoy, hasta: limite,
        eventos: pendientes.length,
        conCosasQueFaltan: pendientes.filter(p => p.falta.length),
        enOrden: pendientes.filter(p => !p.falta.length).map(p => `${p.fecha} · ${p.evento}`),
        apuntesSinChecklist: sinChecklist,
      };
    },
  },

  // ─── ¿ESTO TIENE SENTIDO? ───────────────────────────────────────────────────
  // El fallo caro de este oficio no es calcular mal: es que alguien deje un campo sin
  // poner y nadie lo mire hasta que el camión está cargado. Las reglas viven en
  // revision.js y son concretas y probadas — el asistente las cuenta, no las inventa.
  revisar_evento: {
    datos: true,
    esquema: {
      description: "Repasa la configuración de un evento y dice qué falta, qué no cuadra y de qué hay que acordarse. Úsalo cuando pregunten si un evento está listo, si algo falla o antes de dar por cerrado un evento.",
      parameters: { type: "object", properties: { nombre: { type: "string", description: "Nombre del evento. Vacío para el que está abierto." } } },
    },
    corre: (ctx, { nombre = "" } = {}) => {
      const ev = buscaEvento(ctx, nombre);
      if (ev && ev.error) return ev;   // empatados: se listan y se pide, no se adivina
      if (!ev) return noEncontrado(nombre);
      const r = revisarEvento(ev.nombre, ev.datos);
      return r.todoEnOrden
        ? { evento: ev.nombre, todoEnOrden: true, mensaje: "No he encontrado nada raro: los datos están completos y cuadran." }
        : r;
    },
  },

  revisar_todo: {
    datos: true,
    esquema: {
      description: "Repasa TODOS los eventos que se acercan y dice cuáles tienen algo mal o a medias. Úsalo para '¿está todo listo?' o '¿cómo va el mes?'.",
      parameters: { type: "object", properties: { dias: { type: "number", description: "Cuántos días mirar. Por defecto 30." } } },
    },
    corre: (ctx, { dias = 30 } = {}) => {
      const lista = revisarProximos(ctx.eventosGuardados || {}, Math.max(1, Math.round(dias) || 30));
      if (!lista.length) return { todoEnOrden: true, mensaje: "Todos los eventos que se acercan están completos y sin nada raro." };
      return {
        conAlgo: lista.length,
        // Lo que FALTA primero y por evento: es lo que decide qué hacer esta tarde.
        eventos: lista.map(r => ({
          evento: r.evento, fecha: r.fecha,
          falta: r.avisos.filter(a => a.tono === "falta").map(a => a.texto),
          raro: r.avisos.filter(a => a.tono === "raro").map(a => a.texto),
          acuerdate: r.avisos.filter(a => a.tono === "acuerdate").map(a => a.texto),
        })),
      };
    },
  },

  // ─── LO QUE HAY QUE HACER ───────────────────────────────────────────────────
  // Apuntar escribe, así que va con permiso como todo lo demás. Ver no.
  ver_repaso: {
    datos: true,
    esquema: {
      description: "El repaso que hizo el asistente por la noche, sin que nadie lo pidiera: qué eventos de los próximos días tienen algo sin poner. Úsalo cuando pregunten qué se ha detectado, qué está mal o de qué hay que ocuparse. No lo confundas con revisar_todo: aquello lo calcula ahora con lo que hay en este dispositivo, y esto es lo que se miró en la nube con TODOS los eventos del equipo.",
      parameters: { type: "object", properties: {} },
    },
    corre: (ctx) => {
      const r = ctx.repaso;
      if (!r || !Array.isArray(r.eventos)) {
        return { nada: "Todavía no hay ningún repaso guardado. Lo escribe el Worker por la noche; si acabas de montarlo, puede que aún no haya corrido." };
      }
      const horas = Math.floor((Date.now() - (Number(r.cuando) || 0)) / 3600000);
      return {
        // Cuándo corrió importa tanto como lo que dice: un repaso de hace cinco días
        // habla de un calendario que ya no es el de hoy.
        haceHoras: horas,
        mirados: r.mirados,
        dias: r.dias,
        eventos: r.eventos,
        ...(r.eventos.length ? {} : { todoEnOrden: !!r.mirados }),
      };
    },
  },

  ver_tareas: {
    datos: true,
    esquema: {
      description: "Lo que queda por hacer, agrupado por evento. Úsalo cuando pregunten qué hay pendiente de gestionar (pedir material, llamar a alguien), que no es lo mismo que qué falta por configurar.",
      parameters: { type: "object", properties: { evento: { type: "string", description: "Para ver solo las de un evento." } } },
    },
    corre: (ctx, { evento = "" } = {}) => {
      const grupos = tareasPorEvento(ctx.tareas || [])
        .filter(g => !evento || normaliza(g.evento).includes(normaliza(evento)))
        .map(g => ({ evento: g.titulo, pendientes: g.tareas.filter(t => !t.hecho).map(t => t.texto), hechas: g.tareas.filter(t => t.hecho).length }))
        .filter(g => g.pendientes.length || g.hechas);
      const quedan = sinHacer(ctx.tareas || []).length;
      return grupos.length ? { quedan, grupos } : { quedan: 0, mensaje: "No hay nada apuntado por hacer." };
    },
  },

  apuntar_tarea: {
    datos: true,
    escribe: true,
    esquema: {
      description: "Apunta algo que hay que hacer para que no se pierda: pedir material, llamar a un proveedor, confirmar algo. Si es de un evento concreto, dilo — así se puede mirar antes de ese evento y se cae sola cuando pasa. Si te piden 'recuérdame el 5 de septiembre que...' o algo con un día concreto, pon fecha: se lo dice la persona en cuanto abra el asistente ese día o después (no antes, y no si no vuelve a abrirlo justo ese día — no hay forma de avisar con la app cerrada).",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Qué hay que hacer, en una frase." },
          evento: { type: "string", description: "De qué evento es, si lo es." },
          fecha: { type: "string", description: "AAAA-MM-DD, calculada desde 'Hoy es...'. Solo si te han pedido un recordatorio para un día concreto; vacío para una tarea suelta sin fecha." },
        },
        required: ["texto"],
      },
    },
    corre: (ctx, { texto = "", evento = "", fecha = "" } = {}) => {
      if (!String(texto).trim()) return { error: "No me has dicho qué apuntar." };
      if (!ctx.onEscribir) return { error: "Esta pantalla no deja apuntar tareas." };
      return ctx.onEscribir({
        que: "apuntar_tarea",
        resumen: `Apuntar: "${String(texto).trim()}"${evento ? ` (${evento})` : ""}${fecha ? ` — recordatorio para el ${fecha}` : ""}`,
        datos: { texto: String(texto).trim(), evento: String(evento || ""), fecha: String(fecha || "") },
      });
    },
  },

  marcar_tarea: {
    datos: true,
    escribe: true,
    esquema: {
      description: "Da una tarea por hecha.",
      parameters: { type: "object", properties: { texto: { type: "string", description: "La tarea, o parte de ella." } }, required: ["texto"] },
    },
    corre: (ctx, { texto = "" } = {}) => {
      if (!ctx.onEscribir) return { error: "Esta pantalla no deja tocar las tareas." };
      const hallada = sinHacer(ctx.tareas || []).find(t => normaliza(t.texto).includes(normaliza(texto)));
      if (!hallada) return { error: `No hay ninguna tarea pendiente que se parezca a "${texto}".` };
      return ctx.onEscribir({
        que: "marcar_tarea",
        resumen: `Dar por hecha: "${hallada.texto}"`,
        datos: { id: hallada.id },
      });
    },
  },

  simular_checklist: {
    datos: false,
    esquema: {
      description: "Qué se cargaría en un evento que todavía no existe, dados el tipo y los comensales. Sirve para presupuestar o para comparar antes de crear nada.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", description: "boda, comunion, corporativo, cumpleanos o produccion." },
          adultos: { type: "number" },
          ninos: { type: "number" },
          horasCoctel: { type: "number" },
          horasCopas: { type: "number" },
          categoria: { type: "string", description: "Parte del nombre de una categoría, para no traerlo todo." },
        },
        required: ["tipo", "adultos"],
      },
    },
    corre: (ctx, { tipo = "boda", adultos = 0, ninos = 0, horasCoctel = 0, horasCopas = 0, categoria = "" } = {}) => {
      const a = Math.max(0, Math.round(adultos) || 0);
      if (!a) return { error: "Hacen falta los comensales adultos." };
      let cats;
      try { cats = buildChecklist(tipo, a, Number(horasCoctel) || 0, Number(horasCopas) || 0, Math.max(0, Math.round(ninos) || 0), {}); }
      catch (e) { return { error: `No sé montar una checklist de tipo "${tipo}".` }; }
      const salida = cats
        .filter(c => !categoria || normaliza(c.nombre).includes(normaliza(categoria)))
        .map(c => ({ categoria: c.nombre, items: c.items.filter(Boolean).filter(it => it[1] != null)
          .map(it => `${it[0]}: ${it[1] && it[1].u ? it[1].u : it[1]}`) }))
        .filter(c => c.items.length);
      return { tipo, comensales: a + (ninos || 0), categorias: salida };
    },
  },

  // ─── LA AUDITORÍA ────────────────────────────────────────────────────────────
  // El equivalente de "¿cómo va el negocio?" a nivel de negocio, no de un evento.
  // Lo que devuelve no lo opina el modelo: lo calculan las reglas de revision.js con
  // los datos que la app ya tiene, y aquí solo se leen. La diferencia con revisar_todo
  // (que mira si un evento está listo) es que esto mira si el negocio está perdiendo
  // dinero o dejando de aprender.
  ver_auditoria: {
    datos: true,
    esquema: {
      description: "La auditoría de negocio: lo que los datos ya saben y todavía no se ha hecho — medidas sin aplicar, roturas sin precio, eventos de los que no se puede aprender, huecos del catálogo. Úsala cuando pregunten '¿cómo va el negocio?', '¿qué se puede mejorar?', '¿qué debería mirar?'. Si alguna dice que se puede aplicar un factor medido, se ofrece con aplicar_calibracion (lo aprueba la persona).",
      parameters: { type: "object", properties: {} },
    },
    corre: (ctx) => {
      const lista = ctx.oportunidades;
      if (lista === undefined || lista === null) {
        return { error: "En esta pantalla no hay auditoría de negocio: se hace desde la checklist, donde están los precios y las medidas." };
      }
      if (!lista.length) return { todoEnOrden: true, mensaje: "No hay nada pendiente de los datos: ni medidas sin aplicar ni fugas que ver." };
      return {
        total: lista.length,
        oportunidades: lista.map(a => ({
          texto: a.texto,
          comoSeArregla: a.comoSeArregla || "",
          // El valor exacto para aplicar_calibracion, para que el modelo no lo saque de
          // la cabeza: se copia, no se redondea ni se adivina.
          datos: a.propuesta ? a.propuesta.datos : undefined,
        })),
      };
    },
  },

  // Aplica un factor medido. Escribe, así que va con permiso como todo lo demás, y la
  // propuesta sale por onEscribir igual que el resto (tarjeta "Hacerlo" en "Con
  // permiso", directo en "Confianza"). El número TIENE que ser el que dio ver_auditoria
  // o el panel: si la persona pide un número de la nada, eso se hace en el panel, no
  // por aquí.
  aplicar_calibracion: {
    datos: false,
    escribe: true,
    esquema: {
      description: "Aplica un factor medido (el que sale del histórico de lo que volvió) a la bebida, el hielo o la comida de un tipo de evento. Solo con el factor que dio ver_auditoria o el panel del Modo carga: no se inventan números.",
      parameters: {
        type: "object",
        properties: {
          area: { type: "string", description: "bebida, hielo o comida." },
          tipo: { type: "string", description: "boda, comunion, corporativo, cumpleanos o produccion." },
          clave: { type: "string", description: "bebida: vino, cerveza, cava o refresco. comida: paella o bandejas. Para hielo se deja vacío." },
          factor: { type: "number", description: "El factor medido, con dos decimales." },
        },
        required: ["area", "tipo", "factor"],
      },
    },
    corre: (ctx, { area = "", tipo = "", clave = "", factor = 1 } = {}) => {
      if (!ctx.onEscribir) return { error: "Esta pantalla no deja cambiar los ajustes." };
      return ctx.onEscribir({
        que: "aplicar_calibracion",
        resumen: `Aplicar el factor ${factor} a ${clave || "hielo"} en ${tipo}`,
        datos: { area, tipo, clave, factor: Number(factor) },
      });
    },
  },
};

export const NOMBRES_HERRAMIENTAS = Object.keys(HERRAMIENTAS);

// Las de casa que NO llevan datos de clientes. Es la lista que decide qué se le puede
// preguntar a un proveedor que entrena con lo que recibe.
export const SIN_DATOS = NOMBRES_HERRAMIENTAS.filter(n => !HERRAMIENTAS[n].datos);

// El catálogo REAL de una conversación: las de casa más las de los conectores que estén
// configurados. Todo lo de abajo pasa por aquí, así que una integración nueva aparece
// sola en el catálogo, en la ejecución y en la barrera de datos, sin tocar nada más.
export function todas(conectoresConfig = {}) {
  return conHerramientasDeConectores(HERRAMIENTAS, conectoresConfig);
}

// Ejecutar una herramienta por su nombre. Nunca lanza: un fallo aquí tiene que llegarle
// al modelo como un texto que pueda leer y corregir, no reventar la conversación.
export function ejecutar(nombre, argumentos, contexto = {}) {
  const catalogo = todas(contexto.conectores || {});
  const h = catalogo[nombre];
  if (!h) return { error: `No existe ninguna herramienta que se llame "${nombre}".` };
  // El permiso se comprueba AQUÍ y no solo al armar el catálogo. Son dos cerrojos a
  // propósito: el catálogo evita que el modelo pida lo que no puede, y esto evita que
  // se ejecute si lo pide igual —por una conversación vieja, o por un catálogo que se
  // armó con otro nivel.
  const permiso = permiteNivel(nombre, contexto.nivel || NIVEL_POR_DEFECTO, h);
  if (!permiso.puede) return { error: permiso.motivo };
  try {
    return h.corre(contexto, argumentos || {});
  } catch (e) {
    return { error: `Ha fallado ${nombre}: ${e && e.message ? e.message : e}` };
  }
}

// ¿Esta herramienta devuelve datos con dueño? Se pregunta al catálogo completo y no a
// la lista de casa: si no, una herramienta de un conector no estaría en ninguna lista y
// pasaría por "sin datos" por descuido, que es la forma en que estas cosas fallan.
export function llevaDatos(nombre, conectoresConfig = {}) {
  const h = todas(conectoresConfig)[nombre];
  // Lo que no se conoce se trata como si llevara datos. Ante la duda, no se comparte.
  return h ? !!h.datos : true;
}

// El catálogo en el formato que esperan los proveedores. Se manda en cada petición.
export function catalogoParaModelo(soloSinDatos = false, conectoresConfig = {}, nivel = NIVEL_POR_DEFECTO) {
  const catalogo = todas(conectoresConfig);
  return Object.keys(catalogo)
    .filter(n => !soloSinDatos || !catalogo[n].datos)
    // Lo que el nivel no permite ni se ofrece. Enseñárselo y luego negárselo hace que la
    // conversación se vaya en explicar por qué no puede hacer lo que acaba de proponer.
    .filter(n => permiteNivel(n, nivel, catalogo[n]).puede)
    .map(n => ({ name: n, ...catalogo[n].esquema }));
}
