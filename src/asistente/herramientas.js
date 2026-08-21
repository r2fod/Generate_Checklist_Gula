// ─── LO QUE EL ASISTENTE PUEDE HACER ──────────────────────────────────────────
// Un modelo de lenguaje no sabe nada de esta app. Lo único que sabe es pedir cosas por
// su nombre, y estas son las cosas que puede pedir. Cada herramienta es una función
// normal que se ejecuta AQUÍ, en el navegador, con los datos que ya tiene la app: el
// modelo no toca Firestore ni ve la base de datos, pide y se le contesta.
//
// Esa es toda la seguridad del asunto, y por eso está escrita así:
//
//   · Todas son de SOLO LECTURA. Ninguna escribe nada. Las de escribir vendrán después,
//     con confirmación en pantalla, y aun así habrá cuatro que no se expondrán nunca:
//     marcar cargado, marcar preparado, marcar vuelto y apuntar roturas. La identidad de
//     un item es "categoría::etiqueta"; renombrar o marcar por su cuenta destruiría el
//     trabajo de quien está cargando el camión, que es lo único que esta app no puede
//     permitirse perder.
//
//   · Cada una dice si sus datos son SENSIBLES. Las que devuelven nombres de clientes,
//     fechas o sitios llevan datos: true, y el cliente se niega a mandarlas a un
//     proveedor que entrene con lo que le llega (ver cliente.js). Calcular hielo para
//     100 personas no tiene dueño; "la boda de Fulanita el 12 de septiembre" sí.
//
// No importa React ni la nube: entran datos, sale un resultado. Se prueba con node.
import { calcBebidas, calcHielo } from "../calculos.js";
import { buildChecklist } from "../checklist-generadores.js";
import { escaletaDelEvento, resumenEscaleta } from "../escaleta.js";
import { menusEspeciales, alergiasDeLasNotas } from "../menus-especiales.js";
import { personalNecesario } from "../personal.js";
import { catsDeEventoGuardado } from "../calibracion.js";

// Los nombres se comparan sin tildes, sin mayúsculas y sin sobrar espacios: quien
// pregunta escribe "la boda de fulanita", no "Boda Fulanita y Mengano".
const normaliza = (t) => String(t || "").toLowerCase().trim()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

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
function buscaEvento(ctx, nombre) {
  const archivo = ctx.eventosGuardados || {};
  if (!nombre || !String(nombre).trim()) {
    return ctx.eventoActual ? { nombre: ctx.eventoActual.nombreEvento || "(sin nombre)", datos: ctx.eventoActual } : null;
  }
  const candidatos = Object.entries(archivo)
    .map(([n, d]) => ({ nombre: n, datos: d, puntos: coincide(n, nombre) }))
    .filter(c => c.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos);
  return candidatos.length ? candidatos[0] : null;
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
      description: "Lista los eventos guardados, opcionalmente filtrando por texto (nombre, sitio) o por fecha. Úsalo cuando no sepas el nombre exacto de un evento.",
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

  ver_escaleta: {
    datos: true,
    esquema: {
      description: "A qué hora toca cada cosa el día del evento: salir del obrador, cargar, montar, el servicio y la recogida.",
      parameters: { type: "object", properties: { nombre: { type: "string", description: "Nombre del evento." } } },
    },
    corre: (ctx, { nombre = "" } = {}) => {
      const ev = buscaEvento(ctx, nombre);
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
      description: "Los kilos, bolsas y sacas de hielo que hacen falta. Depende de la temporada, de si hay barra y de si en el sitio hay congelador donde guardarlo.",
      parameters: {
        type: "object",
        properties: {
          comensales: { type: "number", description: "Comensales totales, niños incluidos." },
          verano: { type: "boolean" },
          horasBarra: { type: "number", description: "Horas de barra en total. 0 si no hay." },
          hayCongelador: { type: "boolean" },
        },
        required: ["comensales"],
      },
    },
    corre: (ctx, { comensales = 0, verano = false, horasBarra = 0, hayCongelador = false } = {}) => {
      const n = Math.max(0, Math.round(comensales) || 0);
      if (!n) return { error: "Hacen falta los comensales." };
      return calcHielo(n, { mesVerano: !!verano, horasBarra: Number(horasBarra) || 0, tieneCongelador: !!hayCongelador });
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

  ver_calendario: {
    datos: true,
    esquema: {
      description: "Los apuntes del calendario del equipo en un rango de fechas: qué hay, cuándo y dónde.",
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
};

export const NOMBRES_HERRAMIENTAS = Object.keys(HERRAMIENTAS);

// Las que NO llevan datos de clientes. Es la lista que decide qué se le puede preguntar
// a un proveedor que entrena con lo que recibe.
export const SIN_DATOS = NOMBRES_HERRAMIENTAS.filter(n => !HERRAMIENTAS[n].datos);

// Ejecutar una herramienta por su nombre. Nunca lanza: un fallo aquí tiene que llegarle
// al modelo como un texto que pueda leer y corregir, no reventar la conversación.
export function ejecutar(nombre, argumentos, contexto = {}) {
  const h = HERRAMIENTAS[nombre];
  if (!h) return { error: `No existe ninguna herramienta que se llame "${nombre}".` };
  try {
    return h.corre(contexto, argumentos || {});
  } catch (e) {
    return { error: `Ha fallado ${nombre}: ${e && e.message ? e.message : e}` };
  }
}

// El catálogo en el formato que esperan los proveedores. Se manda en cada petición.
export function catalogoParaModelo(soloSinDatos = false) {
  return NOMBRES_HERRAMIENTAS
    .filter(n => !soloSinDatos || !HERRAMIENTAS[n].datos)
    .map(n => ({ name: n, ...HERRAMIENTAS[n].esquema }));
}
