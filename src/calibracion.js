import { estimarTiemposCarga, FASES_TIEMPO } from "./tiempos-carga.js";
import { horasLogistica, quitarItemsSinCantidad } from "./checklist-format.js";
import { buildChecklist } from "./checklist-generadores.js";
import { BEBIDAS, CLAVES_BEBIDA, TIPOS_BEBIDA, factorDe, esFactorValido } from "./bebida.js";
import { COMIDAS, CLAVES_COMIDA } from "./comida.js";
import { hoyISO, enDiasISO } from "./fecha.js";

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
// Tres y no dos: dos eventos son una anécdota, y cambiar la carga de todo un tipo de
// evento por dos casos es peor que no tocar nada. El mismo umbral rige lo que se mide
// con la vuelta: bebida e hielo.
const MIN_EVENTOS_MEDIR = 3;

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

// Lo que se consumió de un grupo en un evento guardado, y lo que se habría cargado.
// "grupo" es la lista de etiquetas exactas (bebida) o un matcher (comida, para
// etiquetas dinámicas como "Paella <talla>"). Devuelve null si falta algún dato: una
// sola línea del grupo sin apuntar la vuelta ya falsea el total (si no apuntas el
// tinto, el vino sale como si se hubiera bebido entero).
function consumoDeBebida(ev, cats, grupo) {
  const esDeGrupo = (label) => (typeof grupo === "function" ? grupo(label) : grupo.includes(label));
  const renom = ev.categoriasRenombradas || {};
  const vueltos = ev.vueltos || {};
  const overrides = ev.overridesManuales || {};
  let carga = 0, consumo = 0, encontrados = 0;
  for (const cat of cats) {
    const mostrada = renom[cat.nombre] ?? cat.nombre;
    for (const it of cat.items) {
      const label = it[0];
      if (!esDeGrupo(label)) continue;
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
      if (lista.length < MIN_EVENTOS_MEDIR) return;
      const factor = redondeaFactor(mediana(lista) * factorDe(factoresActuales, tipo, bebida));
      if (!esFactorValido(factor)) return;
      if (!salida[tipo]) salida[tipo] = {};
      salida[tipo][bebida] = { factor, nEventos: lista.length };
    });
  });
  return salida;
}

// ─── CUÁNTA COMIDA SE USÓ DE VERDAD ───────────────────────────────────────────
// La misma cuenta que la bebida y el hielo: lo que salió menos lo que volvió SIN USAR.
// La convención (que el panel de comida dice en pantalla) es la que la bebida ya usa,
// hecha explícita para el equipo: en la paella, lo que vuelve es la que no salió; en
// las bandejas, la que no se usó para pasar. Con ella "cargado − vuelto" es lo que de
// verdad se usó, y el factor converge como el resto.
//
// NO cuentan los eventos con paella a mano (numPaellas > 0): ese número no es el
// ratio, y medirlo contra el ratio sesgaría el factor para siempre. Las frituras no
// están aquí: su número es manual por evento, no hay ratio base que calibrar.
export function calibracionComida(eventosGuardados = {}, factoresActuales = {}) {
  const proporciones = {};
  Object.values(eventosGuardados).forEach(ev => {
    if (!ev || !ev.evento || !ev.vueltos) return;
    if (!TIPOS_BEBIDA.includes(ev.evento)) return;
    let cats;
    try { cats = catsDeEventoGuardado(ev); } catch (e) { return; }
    if (!cats.length) return;
    CLAVES_COMIDA.forEach(clave => {
      if (clave === "paella" && (Number(ev.numPaellas) || 0) > 0) return;
      const r = consumoDeBebida(ev, cats, COMIDAS[clave].esDeGrupo);
      if (!r) return;
      if (!proporciones[ev.evento]) proporciones[ev.evento] = {};
      (proporciones[ev.evento][clave] ||= []).push(r.consumo / r.carga);
    });
  });
  const salida = {};
  Object.entries(proporciones).forEach(([tipo, porClave]) => {
    Object.entries(porClave).forEach(([clave, lista]) => {
      if (lista.length < MIN_EVENTOS_MEDIR) return;
      const factor = redondeaFactor(mediana(lista) * Number(factorDe(factoresActuales, tipo, clave)));
      if (!esFactorValido(factor)) return;
      if (!salida[tipo]) salida[tipo] = {};
      salida[tipo][clave] = { factor, nEventos: lista.length };
    });
  });
  return salida;
}

// Dos decimales: la precisión de "se bebió un 83%" es la que hay, y un 0,8271 en una
// casilla del panel solo da sensación de exactitud donde no la hay.
const redondeaFactor = (n) => Math.round(n * 100) / 100;

// ─── CUÁNTO HIELO SE USÓ DE VERDAD ────────────────────────────────────────────
// La misma cuenta que la bebida, con otro item: la línea "Hielo" ya soporta cantidad en
// "Vuelve" (true = volvió todo, o los kilos que volvieron), así que no hace falta marcar
// nada nuevo. Se compara contra la checklist reconstruida —lo que la app cargaría HOY
// para ese evento, con su temporada, su barra, su merma y su factor vigente— y no
// contra el ratio pelado: por lo mismo que en la bebida, así queda fuera todo lo que la
// app ya sabe, y el factor converge (aplicar la sugerencia y volver a medir da 1).
const ITEM_HIELO = "Hielo";
export function calibracionHielo(eventosGuardados = {}, factoresActuales = {}) {
  const proporciones = {};
  Object.values(eventosGuardados).forEach(ev => {
    if (!ev || !ev.evento || !ev.vueltos) return;
    if (!TIPOS_BEBIDA.includes(ev.evento)) return;
    let cats;
    try { cats = catsDeEventoGuardado(ev); } catch (e) { return; }
    if (!cats.length) return;
    const r = consumoDeBebida(ev, cats, [ITEM_HIELO]);
    if (!r) return;
    (proporciones[ev.evento] ||= []).push(r.consumo / r.carga);
  });
  const salida = {};
  Object.entries(proporciones).forEach(([tipo, lista]) => {
    if (lista.length < MIN_EVENTOS_MEDIR) return;
    const factor = redondeaFactor(mediana(lista) * Number(factoresActuales[tipo] || 1));
    if (!esFactorValido(factor)) return;
    salida[tipo] = { factor, nEventos: lista.length };
  });
  return salida;
}

// ─── HUECOS DEL CATÁLOGO ──────────────────────────────────────────────────────
// El Resumen solo cobra lo que tiene precio. Un item sin precio no es "gratis", es
// "no cobrado": el total se queda corto en silencio. Esto mira los eventos que están
// por cargar y cuenta cuántas líneas van a quedar fuera del coste.
//
// Vive aquí (no en revision.js) porque necesita reconstruir la checklist, y quien
// importa el generador es este fichero: meterlo en revision.js engordaría el Worker
// con una cuenta que solo se hace en la app.
//
// La comprobación va por la etiqueta base: si se renombró a mano y solo el nombre
// nuevo tiene precio, cuenta como sin precio — aproximación a la baja, y el aviso
// sigue siendo cierto: alguien tiene que mirarlo. Umbrales (10 líneas, 5 sin precio)
// para no convertir un eventillo en noticia.
export function huecosDeCatalogo(eventosGuardados = {}, precios = {}) {
  const desde = hoyISO();
  const hasta = enDiasISO(30);
  const salidas = [];
  Object.entries(eventosGuardados).forEach(([nombre, e]) => {
    if (!e || !e.evento) return;
    if (!((e.fechaEvento || "") >= desde && (e.fechaEvento || "") <= hasta)) return;
    let cats;
    try { cats = catsDeEventoGuardado(e); } catch (err) { return; }
    let total = 0, sinPrecio = 0;
    const ejemplos = [];
    cats.forEach(c => c.items.filter(Boolean).forEach(it => {
      const qty = aNumero(it[1]);
      if (qty === null || qty <= 0) return;
      total++;
      if (precios[it[0]] === undefined) {
        sinPrecio++;
        if (ejemplos.length < 3) ejemplos.push(it[0]);
      }
    }));
    if (total >= 10 && sinPrecio >= 5) {
      salidas.push({ nombre, fecha: e.fechaEvento || "", total, sinPrecio, ejemplos });
    }
  });
  return salidas.sort((a, b) => b.sinPrecio - a.sinPrecio).slice(0, 3);
}

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
