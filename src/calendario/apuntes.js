// ─── LOS APUNTES DEL CALENDARIO ───────────────────────────────────────────────
// El calendario de pared del equipo, pero dentro de la app. Un apunte es lo mínimo
// que se escribe en una casilla: qué día, qué es y cómo se llama. Nada más.
//
// Son DOS cosas distintas y conviene no mezclarlas:
//
//   · APUNTE   — "13 sep, boda de los Fulanitos". Tres datos. Se apunta en cuanto se
//                cierra la fecha, meses antes, y no necesita nada más.
//   · EVENTO   — la checklist entera con sus cantidades, su logística y su carga.
//
// Un año tiene sesenta apuntes y cuatro o cinco eventos vivos a la vez. Si cada apunte
// naciera como evento completo, el archivo estaría lleno de fichas a medio rellenar y
// no se distinguiría lo que hay que preparar YA de lo que es para dentro de ocho meses.
// Por eso el apunte se convierte en evento solo cuando se acerca (ver aVistaProxima).
//
// Aquí dentro no hay React ni navegador: entra un dato, sale un dato. Se prueba con
// node en milisegundos.

// Los cinco tipos de evento son los mismos que genera la app. Los otros tres no son
// eventos: son las capas que hacen falta para poder anticipar de verdad, y salen de lo
// que ya apuntáis a mano en la hoja (vacaciones del equipo, recogidas de camión y
// generadores, y días que no se cogen).
export const TIPOS = {
  boda: { nombre: "Boda", esEvento: true },
  comunion: { nombre: "Comunión", esEvento: true },
  corporativo: { nombre: "Corporativo", esEvento: true },
  cumpleanos: { nombre: "Cumpleaños", esEvento: true },
  produccion: { nombre: "Producción", esEvento: true },
  vacaciones: { nombre: "Vacaciones", esEvento: false },
  recogida: { nombre: "Recogida / devolución", esEvento: false },
  cerrado: { nombre: "Día cerrado", esEvento: false },
};

export const esTipoEvento = (tipo) => !!(TIPOS[tipo] && TIPOS[tipo].esEvento);

// Cuántos días antes deja de ser "algo apuntado en el calendario" y pasa a ser "algo
// que hay que preparar". Dos semanas es lo que se tarda en cerrar proveedores, mirar
// alquileres y cuadrar gente; a menos de eso ya se va con prisa.
export const DIAS_ANTICIPACION = 14;

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Fechas SIN hora y sin huso: "2026-09-13" es el 13 de septiembre en todas partes.
// Con new Date("2026-09-13") se interpreta en UTC y en España, de madrugada, cae en el
// día anterior — un evento del 13 aparecía el 12 en el calendario.
export function aFecha(iso) {
  if (typeof iso !== "string" || !SOLO_FECHA.test(iso)) return null;
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, m - 1, d);
  // Rechaza lo imposible: "2026-02-31" se convertiría solo en el 3 de marzo
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d ? f : null;
}

export const aISO = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

// Días entre dos fechas, contando por días de calendario y no por horas: de las 23:00
// del lunes a la 01:00 del martes hay dos horas, pero es "mañana", no "hoy".
export function diasHasta(iso, hoy = new Date()) {
  const f = aFecha(iso);
  if (!f) return null;
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((f - base) / 86400000);
}

// Un apunte válido tiene, como mínimo, fecha y título. Todo lo demás es opcional: la
// gracia de un calendario es poder escribir "boda Marina" en cuanto te dan la fecha,
// sin tener que saber ni el pax ni el sitio.
export function saneaApunte(bruto) {
  if (!bruto || typeof bruto !== "object") return null;
  const fecha = typeof bruto.fecha === "string" ? bruto.fecha.trim() : "";
  const titulo = typeof bruto.titulo === "string" ? bruto.titulo.trim() : "";
  if (!aFecha(fecha) || !titulo) return null;
  const tipo = TIPOS[bruto.tipo] ? bruto.tipo : "boda";
  const limpio = { id: String(bruto.id || "").trim() || idDeApunte(fecha, titulo), fecha, titulo, tipo };
  // Hasta es para lo que dura varios días (unas vacaciones, un rodaje de tres jornadas).
  // Si viene antes que la fecha de inicio se tira: un rango al revés no existe.
  if (typeof bruto.hasta === "string" && aFecha(bruto.hasta) && bruto.hasta >= fecha) limpio.hasta = bruto.hasta;
  if (Number.isFinite(bruto.pax) && bruto.pax > 0) limpio.pax = Math.round(bruto.pax);
  if (typeof bruto.sitio === "string" && bruto.sitio.trim()) limpio.sitio = bruto.sitio.trim();
  if (typeof bruto.notas === "string" && bruto.notas.trim()) limpio.notas = bruto.notas.trim();
  // El nombre del evento de la app que salió de este apunte. Es lo que impide que se
  // vuelva a crear una y otra vez cada vez que se abre el calendario.
  if (typeof bruto.evento === "string" && bruto.evento.trim()) limpio.evento = bruto.evento.trim();
  return limpio;
}

// El identificador sale de la fecha y del título, no de un contador ni de un aleatorio.
// Así, si el mismo apunte se importa dos veces —de la hoja y a mano—, es EL MISMO y no
// aparece duplicado en el calendario.
export function idDeApunte(fecha, titulo) {
  const limpio = String(titulo)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${fecha}_${limpio}`;
}

// Descarta lo que no vale y quita repetidos, quedándose con el último de cada id: dos
// dispositivos pueden haber tocado el mismo apunte.
export function saneaLista(lista) {
  if (!Array.isArray(lista)) return [];
  const porId = new Map();
  for (const bruto of lista) {
    const a = saneaApunte(bruto);
    if (a) porId.set(a.id, a);
  }
  return [...porId.values()].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.titulo.localeCompare(y.titulo));
}

// Todos los días que ocupa un apunte. Uno normal ocupa uno; unas vacaciones de tres
// semanas ocupan veintiuno, y tienen que pintarse en los veintiuno o no sirven de nada.
export function diasDelApunte(apunte) {
  const desde = aFecha(apunte.fecha);
  if (!desde) return [];
  const hasta = apunte.hasta ? aFecha(apunte.hasta) : desde;
  const dias = [];
  // Tope de seguridad: un rango absurdo (por un dedazo en el año) no puede generar
  // cientos de miles de días y dejar la pantalla colgada.
  for (let f = new Date(desde); f <= hasta && dias.length < 400; f.setDate(f.getDate() + 1)) dias.push(aISO(f));
  return dias;
}

// Qué apuntes caen en cada día, listo para pintar el mes. Devuelve un mapa
// "2026-09-13" → [apuntes], con los eventos delante: en una casilla con una boda y unas
// vacaciones, lo que hay que ver primero es la boda.
export function porDia(apuntes) {
  const mapa = {};
  for (const a of apuntes) {
    for (const dia of diasDelApunte(a)) (mapa[dia] ||= []).push(a);
  }
  for (const dia of Object.keys(mapa)) {
    mapa[dia].sort((x, y) => (esTipoEvento(y.tipo) ? 1 : 0) - (esTipoEvento(x.tipo) ? 1 : 0));
  }
  return mapa;
}

// Lo que viene: los eventos de los próximos N días, ordenados por lo que queda. Solo
// eventos — las vacaciones y los días cerrados no son cosas que haya que preparar, se
// cruzan aparte para avisar de que falta gente.
export function aVistaProxima(apuntes, { dias = DIAS_ANTICIPACION, hoy = new Date() } = {}) {
  return apuntes
    .filter(a => esTipoEvento(a.tipo))
    .map(a => ({ ...a, faltan: diasHasta(a.fecha, hoy) }))
    .filter(a => a.faltan !== null && a.faltan >= 0 && a.faltan <= dias)
    .sort((x, y) => x.faltan - y.faltan || x.titulo.localeCompare(y.titulo));
}

// Qué apuntes toca convertir en evento de la app. Solo los que se acercan y no lo son
// ya: sin la marca "evento" se volverían a crear en cada apertura del calendario y
// acabarías con veinte copias de la misma boda.
export function apuntesPorPromover(apuntes, { dias = DIAS_ANTICIPACION, hoy = new Date() } = {}) {
  return aVistaProxima(apuntes, { dias, hoy }).filter(a => !a.evento);
}

// Dos eventos el mismo día. No es un error —pasa, y se hacen— pero es justo lo que hay
// que ver con tiempo, porque duplica la gente y el material que hace falta ese día.
export function choques(apuntes) {
  const mapa = porDia(apuntes.filter(a => esTipoEvento(a.tipo)));
  return Object.entries(mapa)
    .filter(([, del]) => del.length > 1)
    .map(([dia, del]) => ({ dia, apuntes: del }))
    .sort((x, y) => x.dia.localeCompare(y.dia));
}

// Quién NO está disponible un día. Cruzar esto con los choques es lo que convierte el
// calendario en algo que evita sustos: "el 10 tienes dos bodas y Irene está de
// vacaciones" es un aviso que hoy no da nadie.
export function ausentesEn(apuntes, dia) {
  const mapa = porDia(apuntes.filter(a => a.tipo === "vacaciones"));
  return (mapa[dia] || []).map(a => a.titulo);
}

// ─── LA REJILLA DEL MES ───────────────────────────────────────────────────────
// Las semanas de un mes, de lunes a domingo, con los huecos del principio y del final
// como null. La cuenta va aquí y no en la pantalla porque es donde se cometen los
// errores clásicos —el mes que empieza en domingo, febrero de un bisiesto— y aquí se
// comprueban con node en vez de mirando el calendario a ojo.
export function semanasDelMes(anio, mes) {
  const primero = new Date(anio, mes - 1, 1);
  // getDay() cuenta desde el domingo; aquí la semana empieza en lunes, como el
  // calendario de pared y como se lee en España.
  const hueco = (primero.getDay() + 6) % 7;
  const dias = new Date(anio, mes, 0).getDate();
  const celdas = [...Array(hueco).fill(null), ...Array.from({ length: dias }, (_, i) => aISO(new Date(anio, mes - 1, i + 1)))];
  while (celdas.length % 7) celdas.push(null);
  return Array.from({ length: celdas.length / 7 }, (_, s) => celdas.slice(s * 7, s * 7 + 7));
}

export const NOMBRE_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const INICIAL_DIA = ["L", "M", "X", "J", "V", "S", "D"];

// ─── EL EQUIPO ────────────────────────────────────────────────────────────────
// Quién puede estar de vacaciones o librar. Sin esta lista no se puede avisar de que
// un día hay dos bodas y falta gente, que es la mitad de la gracia del calendario.
//
// En la hoja de pared cada uno se apunta como le sale: "VACAS IRENE", "VACAS RO",
// "LIBRA ANTO", "Vacas Anna". Los apodos van aquí para que todo eso caiga en la misma
// persona en vez de crear cuatro fantasmas distintos.
// VA VACÍO EN EL CÓDIGO A PROPÓSITO. El repositorio es público, y los nombres de la
// plantilla con sus vacaciones son datos personales de gente real: eso vive en
// Firestore, junto al calendario, y se configura desde la app.
//
// Aquí solo queda la FORMA que tiene que tener:
//   [{ nombre: "Fulanita", apodos: ["fulanita", "fula"] }]
// Los apodos son para que "VACAS FULA" y "Vacas Fulanita" caigan en la misma persona
// en vez de crear dos fantasmas distintos.
export const EQUIPO = [];

const sinAcentos = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Saca la persona de un texto suelto. Se busca por palabras completas y no por trozos:
// con "contiene" a secas, "ro" cazaba dentro de "Rodrigo" y "Roberto", y media hoja se
// habría convertido en vacaciones de Rocío.
//
// Se prueban los apodos de más largo a más corto para que "rocio" gane a "ro" y no
// dependa del orden en que estén escritos arriba.
export function personaDeTexto(texto, equipo = EQUIPO) {
  const palabras = new Set(sinAcentos(texto).split(/[^a-z0-9]+/).filter(Boolean));
  let mejor = null;
  for (const p of equipo) {
    for (const apodo of p.apodos) {
      if (palabras.has(apodo) && (!mejor || apodo.length > mejor.largo)) {
        mejor = { nombre: p.nombre, largo: apodo.length };
      }
    }
  }
  return mejor ? mejor.nombre : null;
}

// Quién queda para trabajar un día: el equipo menos quien esté de vacaciones. Es lo que
// convierte "el 10 hay dos bodas" en "el 10 hay dos bodas y solo estáis tres".
export function disponiblesEn(apuntes, dia, equipo = EQUIPO) {
  const fuera = new Set(ausentesEn(apuntes, dia).map(t => personaDeTexto(t, equipo) || t));
  return equipo.map(p => p.nombre).filter(n => !fuera.has(n));
}
