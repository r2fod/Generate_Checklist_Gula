import { estimarTiemposCarga, FASES_TIEMPO } from "./tiempos-carga.js";
import { horasLogistica, quitarItemsSinCantidad } from "./checklist-format.js";
import { buildChecklist } from "./checklist-generadores.js";
import { BEBIDAS, CLAVES_BEBIDA, TIPOS_BEBIDA, factorDe, esFactorValido } from "./bebida.js";
import { PAX_POR_CAMARERO, saneaRatios } from "./personal.js";

// ─── CALIBRACIÓN CON LOS TIEMPOS REALES ───────────────────────────────────────
// Las estimaciones de tiempos-carga.js son de sector. En cuanto hay eventos con el
// cronómetro usado, se comparan con lo estimado y se saca un factor por fase: si de
// verdad se tarda un 20% más cargando, las próximas estimaciones lo reflejan.
// Se usa la MEDIANA (no la media) para que un evento raro no descoloque el ajuste, y
// hacen falta al menos 3 eventos medidos por fase para fiarse.
const MIN_EVENTOS_CALIBRAR = 3;
function medianaFactor(valores) {
  if (valores.length < MIN_EVENTOS_CALIBRAR) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const m = orden.length % 2
    ? orden[(orden.length - 1) / 2]
    : (orden[orden.length / 2 - 1] + orden[orden.length / 2]) / 2;
  // Se acota entre la mitad y el triple: un factor fuera de ahí es un cronómetro
  // que se dejó corriendo, no un dato real.
  return Math.min(3, Math.max(0.5, m));
}
export function calcularCalibracion(eventosGuardados = {}) {
  const ratios = { prep: [], carga: [], descarga: [], montaje: [] };
  Object.values(eventosGuardados).forEach(ev => {
    if (!ev || !ev.cronos) return;
    const items = (ev.totalItemsCarga ?? 0) || contarItemsCarga(ev);
    if (!items) return;
    const est = estimarTiemposCarga({
      totalItems: items,
      pax: (ev.pax || 0) + (ev.ninos || 0),
      numLogistica: numLogisticaDe(ev),
      horasJornada: horasJornadaDe(ev),
    }, null);
    FASES_TIEMPO.forEach(f => {
      const real = (ev.cronos[f] && ev.cronos[f].ms) || 0;
      const estimado = est[`${f}Min`] * 60000;
      if (real > 60000 && estimado > 0) ratios[f].push(real / estimado);
    });
  });
  const factores = {};
  let nMedidos = 0;
  FASES_TIEMPO.forEach(f => {
    const factor = medianaFactor(ratios[f]);
    if (factor !== null) { factores[f] = factor; nMedidos = Math.max(nMedidos, ratios[f].length); }
  });
  return Object.keys(factores).length ? { factores, nMedidos } : null;
}
function numLogisticaDe(ev) {
  const n = (ev.logisticaEquipo || []).filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length;
  return n > 0 ? n : Math.max(1, Math.ceil((ev.pax || 0) / 60));
}
function horasJornadaDe(ev) {
  return (ev.logisticaEquipo || []).reduce((mx, p) => { const h = horasLogistica(p.inicio, p.fin); return h && h > mx ? h : mx; }, 0);
}
// Nº de items que se cargan de verdad en un evento guardado (sin los que no llevan
// cantidad y sin "Personal"), para poder comparar su tiempo real con el estimado.
function contarItemsCarga(ev) {
  try {
    return quitarItemsSinCantidad(checklistDeEventoGuardado(ev))
      .filter(c => !/personal/i.test(c.nombre))
      .reduce((a, c) => a + c.items.length, 0);
  } catch (e) { return 0; }
}

// ─── REVISIÓN DE DATOS GUARDADOS ──────────────────────────────────────────────
// Reconstruye la checklist (categorías + items) de un evento GUARDADO a partir de
// su configuración, para poder comparar sus marcas con los items que tendría hoy
// sin necesidad de abrirlo. Aplica las categorías renombradas y añade los items
// puestos a mano (la clave usa la etiqueta base del item).
export function checklistDeEventoGuardado(ev) {
  let cats;
  try { cats = catsDeEventoGuardado(ev); } catch (e) { return []; }
  if (!cats.length) return [];
  const renom = ev.categoriasRenombradas || {};
  const salida = cats.map(c => ({ nombre: renom[c.nombre] ?? c.nombre, items: c.items.map(it => it[0]) }));
  (ev.itemsManuales || []).forEach(it => {
    const nombreCat = renom[it.categoria] ?? it.categoria ?? "Otros";
    let destino = salida.find(c => c.nombre === nombreCat);
    if (!destino) { destino = { nombre: nombreCat, items: [] }; salida.push(destino); }
    destino.items.push(it.label);
  });
  return salida;
}

// ─── CUÁNTO SE BEBIÓ DE VERDAD ────────────────────────────────────────────────
// El único dato honesto sobre cuánta bebida hace falta en una comunión no está en
// ningún manual: está en los eventos ya hechos, en la diferencia entre lo que salió en
// el camión y lo que volvió sin abrir. Eso ya se apunta en Modo carga → "Vuelve".
//
// Aquí se convierte en un factor por tipo de evento (ver bebida.js): se compara lo
// consumido con lo que la app habría cargado HOY para ese evento, y esa proporción,
// multiplicada por el factor que ya estuviera puesto, es el factor de verdad. Hacerlo
// contra la carga reconstruida y no contra el ratio pelado es lo que deja fuera todo lo
// que ya sabe la app —temporada, horas de barra, brindis, niños— sin repetir su cuenta.
// Y al multiplicar por el factor vigente el ajuste converge: aplicar la sugerencia y
// volver a medir da 1, no otra corrección encima.
const MIN_EVENTOS_BEBIDA = 3;

// Lo cargado y lo vuelto de un item, buscando la clave con el nombre de categoría tal
// cual y también renombrado: la marca se guardó con el nombre que la categoría tenía en
// ese momento, y desde entonces se puede haber cambiado.
function marcaDe(mapa, catBase, catMostrada, label) {
  const v = mapa[`${catBase}::${label}`];
  return v !== undefined ? v : mapa[`${catMostrada}::${label}`];
}

function aNumero(x) {
  const n = parseFloat(String(x && x.u ? x.u : x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Lo que se consumió de una bebida en un evento guardado, y lo que se habría cargado.
// Devuelve null si falta algún dato: una sola línea del grupo sin apuntar la vuelta ya
// falsea el total (si no apuntas el tinto, el vino sale como si se hubiera bebido entero).
function consumoDeBebida(ev, cats, labels) {
  const renom = ev.categoriasRenombradas || {};
  const vueltos = ev.vueltos || {};
  const overrides = ev.overridesManuales || {};
  let carga = 0, consumo = 0, encontrados = 0;
  for (const cat of cats) {
    const mostrada = renom[cat.nombre] ?? cat.nombre;
    for (const it of cat.items) {
      const label = it[0];
      if (!labels.includes(label)) continue;
      encontrados++;
      const override = marcaDe(overrides, cat.nombre, mostrada, label);
      const qty = aNumero(override !== undefined ? override : it[1]);
      if (qty === null || qty <= 0) return null;
      const raw = marcaDe(vueltos, cat.nombre, mostrada, label);
      if (raw === undefined || raw === "") return null;       // no se apuntó la vuelta
      const vuelta = raw === true ? qty : aNumero(raw);
      if (vuelta === null || vuelta > qty) return null;        // "vuelven más de las que salieron"
      carga += qty;
      consumo += qty - vuelta;
    }
  }
  if (!encontrados || carga <= 0) return null;
  return { carga, consumo };
}

// La mediana, no la media: un evento con un barril reventado no puede mover el factor
// de todos los demás.
function mediana(valores) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden.length % 2
    ? orden[(orden.length - 1) / 2]
    : (orden[orden.length / 2 - 1] + orden[orden.length / 2]) / 2;
}

// { boda: { vino: { factor: 0.83, nEventos: 4 } }, ... } — solo lo que tiene datos
// suficientes. Lo que no aparece es que nadie ha medido eso todavía, y se queda en 1.
export function calibracionBebida(eventosGuardados = {}, factoresActuales = {}) {
  const proporciones = {};
  Object.values(eventosGuardados).forEach(ev => {
    if (!ev || !ev.evento || !ev.vueltos) return;
    if (!TIPOS_BEBIDA.includes(ev.evento)) return;
    let cats;
    try { cats = catsDeEventoGuardado(ev); } catch (e) { return; }
    if (!cats.length) return;
    CLAVES_BEBIDA.forEach(bebida => {
      const r = consumoDeBebida(ev, cats, BEBIDAS[bebida].items);
      if (!r) return;
      if (!proporciones[ev.evento]) proporciones[ev.evento] = {};
      (proporciones[ev.evento][bebida] ||= []).push(r.consumo / r.carga);
    });
  });
  const salida = {};
  Object.entries(proporciones).forEach(([tipo, porBebida]) => {
    Object.entries(porBebida).forEach(([bebida, lista]) => {
      if (lista.length < MIN_EVENTOS_BEBIDA) return;
      const factor = redondeaFactor(mediana(lista) * factorDe(factoresActuales, tipo, bebida));
      if (!esFactorValido(factor)) return;
      if (!salida[tipo]) salida[tipo] = {};
      salida[tipo][bebida] = { factor, nEventos: lista.length };
    });
  });
  return salida;
}

// Dos decimales: la precisión de "se bebió un 83%" es la que hay, y un 0,8271 en una
// casilla del panel solo da sensación de exactitud donde no la hay.
const redondeaFactor = (n) => Math.round(n * 100) / 100;

// Las categorías con sus cantidades, tal y como saldrían hoy. checklistDeEventoGuardado
// se queda solo con las etiquetas; la calibración necesita también los números.
export function catsDeEventoGuardado(ev) {
  if (!ev || !ev.evento) return [];
  const opts = {
    ...ev,
    tipoBBQ: (ev.tipoBBQ || "").toLowerCase(),
    tipoHorno: (ev.tipoHorno || "").toLowerCase(),
    numLogisticaEquipo: (ev.logisticaEquipo || []).filter(p => (p.nombre && p.nombre.trim()) || p.inicio || p.fin).length,
  };
  return buildChecklist(ev.evento, ev.pax || 0, ev.barraCoctel ? (ev.horasCoctel || 0) : 0, ev.barraCopas ? (ev.horasCopas || 0) : 0, ev.ninos || 0, opts);
}

// ─── CUÁNTA GENTE HIZO FALTA DE VERDAD ────────────────────────────────────────
// El mismo principio que calibracionBebida, pero para el ratio de sala: el dato honesto
// no está en ningún manual, está en los eventos donde alguien puso a mano el número de
// camareros (numCamareros) porque el automático no encajaba. Ese campo, comparado con
// los pax del evento, es EXACTAMENTE cómo se sacaron los ratios de partida — ver la
// cabecera de personal.js: "salen de contar el personal que se puso de verdad en 19
// eventos". Aquí se hace lo mismo, pero se actualiza solo con cada evento nuevo en vez
// de una vez y para siempre.
//
// Se descartan los eventos que ADEMÁS tuvieran puesto paxPorCamarero: ese campo ya es
// "aquí quiero un ratio distinto a propósito para este evento", y mezclarlo con "el
// ratio de serie se quedó corto" ensuciaría la medida con algo que no es un fallo del
// ratio, es una decisión ya tomada.
const MIN_EVENTOS_PERSONAL = 3;

// { boda: { ratio: 8, nEventos: 4 }, ... } — solo lo que tiene datos suficientes. Lo que
// no aparece es que nadie ha puesto numCamareros a mano lo bastante como para fiarse.
export function calibracionPersonal(eventosGuardados = {}) {
  const porTipo = {};
  Object.values(eventosGuardados).forEach(ev => {
    if (!ev || !(ev.evento in PAX_POR_CAMARERO)) return;
    if (Number(ev.paxPorCamarero) > 0) return;
    const pax = Number(ev.pax) || 0;
    const num = Number(ev.numCamareros) || 0;
    if (pax <= 0 || num <= 0) return;
    (porTipo[ev.evento] ||= []).push(pax / num);
  });
  const salida = {};
  Object.entries(porTipo).forEach(([tipo, lista]) => {
    if (lista.length < MIN_EVENTOS_PERSONAL) return;
    const ratio = saneaRatios({ [tipo]: Math.round(mediana(lista)) })[tipo];
    if (ratio === undefined) return;
    salida[tipo] = { ratio, nEventos: lista.length };
  });
  return salida;
}
