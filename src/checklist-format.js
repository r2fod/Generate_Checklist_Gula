import { BATEA } from "./calculos.js";

// ─── EVENTOS ────────────────────────────────────────────────────────────────
export const EVENTOS = {
  boda:        { label: "Boda",              icon: "♥" },
  comunion:    { label: "Comunión / Bautizo", icon: "✚" },
  cumpleanos:  { label: "Cumpleaños",         icon: "✦" },
  corporativo: { label: "Evento corporativo", icon: "▣" },
  produccion:  { label: "Producción / Shooting", icon: "▶" },
};

// Qué tamaño de batea corresponde a cada tipo de vaso/copa, detectado por el nombre
// del item. Así el nº de bateas se recalcula siempre en vivo a partir de la cantidad
// que se esté mostrando (aunque se edite a mano), en vez de quedar fijado en un texto.
const BATEA_POR_LABEL = [
  { fragmento: "chupito cristal", size: BATEA.chupito },
  { fragmento: "vasos de agua", size: BATEA.agua }, { fragmento: "vasos cristal", size: BATEA.agua },
  { fragmento: "copas de vino", size: BATEA.vino }, { fragmento: "copas cristal", size: BATEA.vino },
  { fragmento: "vasos de cubata", size: BATEA.cubata }, { fragmento: "vaso cubata", size: BATEA.cubata },
  { fragmento: "copas de cava", size: BATEA.cava }, { fragmento: "copa cava", size: BATEA.cava },
];
export function bateaSizeDe(label) {
  const norm = label.toLowerCase();
  const m = BATEA_POR_LABEL.find(b => norm.includes(b.fragmento));
  return m ? m.size : null;
}
// "1 caja" y no "1 cajas". Parece una tontería hasta que se lee "1 cajas de 24" al
// lado de un número y hay que pararse a pensar qué está diciendo.
function plural(n, singular, plural_) { return `${n} ${n === 1 ? singular : plural_}`; }

function conBateas(label, qtyTexto) {
  const size = bateaSizeDe(label);
  const num = parseFloat(String(qtyTexto).replace(",", "."));
  if (!size || isNaN(num)) return qtyTexto;
  return `${qtyTexto} (${plural(Math.ceil(num / size), "batea", "bateas")} de ${size})`;
}
// Mismo mecanismo que las bateas, para bebidas que se piden en cajas de tamaño fijo:
// cerveza (24 tercios/caja), vino y tinto de verano (6 botellas/caja) y refrescos
// (24 uds/caja). El nº de cajas se recalcula en vivo igual que las bateas.
const CAJA_POR_LABEL = [
  { fragmento: "cerveza alhambra", size: 24 },
  { fragmento: "vino blanco", size: 6 }, { fragmento: "vino tinto", size: 6 }, { fragmento: "tinto de verano", size: 6 },
  { fragmento: "coca-cola", size: 24 }, { fragmento: "fanta", size: 24 }, { fragmento: "aquarius", size: 24 },
  { fragmento: "sprite", size: 24 }, { fragmento: "nestea", size: 24 },
];
export function cajaSizeDe(label) {
  const norm = label.toLowerCase();
  const m = CAJA_POR_LABEL.find(c => norm.includes(c.fragmento));
  return m ? m.size : null;
}
function conCajas(label, qtyTexto) {
  const size = cajaSizeDe(label);
  const num = parseFloat(String(qtyTexto).replace(",", "."));
  if (!size || isNaN(num)) return qtyTexto;
  return `${qtyTexto} (${plural(Math.ceil(num / size), "caja", "cajas")} de ${size})`;
}
// Empareja un número editable con el texto fijo del envase (packs, cajas, paq.,
// cargas...), para que al corregir la cantidad a mano no haya que retocar también
// ese texto — se guarda aparte y no se pierde ni queda desincronizado al editar.
export function conSufijo(u, sufijo) { return { u, sufijo }; }
// Añade la info de bateas (cristalería) o el sufijo de envase (packs/cajas/paq.) a
// la cantidad mostrada, para Word/Vista previa/texto — en la lista principal esa
// info se muestra aparte, no mezclada en el campo editable.
export function fmtCantidadCompleta(label, qtyTexto, sufijo) {
  const conBatea = conBateas(label, qtyTexto);
  if (conBatea !== qtyTexto) return conBatea;
  const conCaja = conCajas(label, qtyTexto);
  if (conCaja !== qtyTexto) return conCaja;
  return sufijo ? `${qtyTexto} ${sufijo}` : qtyTexto;
}
// Un item se marca como ALQUILER de tres formas, en este orden: porque el generador
// lo crea ya marcado (tercer dato de la tupla, ver opt/buildChecklist), porque se ha
// marcado a mano con el ✎, o porque el nombre lleva el proveedor dentro. Lo tercero es
// el respaldo de siempre: sin él, un item escrito a mano como "Camión (alquiler)"
// perdería el tag.
export const PALABRAS_ALQUILER = ["dealde", "carvillo", "novelda", "alquiler"];
export const CATEGORIA_MANUAL = "Otros (añadidos manualmente)";

// Un item sin cantidad real (vacío, solo "—" a decidir in situ, o en 0 porque no
// hace falta ninguno) no aporta nada a la hora de cargar el camión ni de imprimir
// — se queda fuera de Modo carga, Vista previa y Word/PDF, pero sigue editable en
// la checklist principal de la app por si se quiere rellenar a mano.
function tieneCantidadVisible(qty) {
  const v = String(qty && qty.u ? qty.u : qty).trim();
  return v !== "" && v !== "—" && v !== "-" && v !== "0";
}

export function quitarItemsSinCantidad(checklist) {
  return checklist
    .map(cat => ({ ...cat, items: cat.items.filter(([, qty]) => tieneCantidadVisible(qty)) }))
    .filter(cat => cat.items.length > 0);
}

// Horas trabajadas entre dos horas "HH:MM" (si acaba pasada la medianoche, suma 24h)
export function horasLogistica(inicio, fin) {
  if (!inicio || !fin) return null;
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let h = (hf + mf / 60) - (hi + mi / 60);
  if (h < 0) h += 24;
  return Math.round(h * 4) / 4; // redondeo al cuarto de hora
}

// Importe de una persona de logística: horas × tarifa + plus de furgoneta si lo lleva
export function importeLogistica(p, tarifa, plusFurgo) {
  const h = horasLogistica(p.inicio, p.fin);
  if (h === null) return null;
  // "Nómina": ya cobra su sueldo, no suma coste por horas al evento (solo la furgoneta
  // si la pone). "Extra" (por defecto): se paga por horas × tarifa + plus de furgoneta.
  const costeHoras = p.tipo === "nomina" ? 0 : h * (tarifa || 0);
  return Math.round((costeHoras + (p.furgoneta ? (plusFurgo || 0) : 0)) * 100) / 100;
}

// "Juan 08:00–13:30 (5,5h · 55€) · Pedro 09:00–14:00 (5h · 70€ con furgo)"
export function fmtLogistica(equipo = [], tarifa = 0, plusFurgo = 0) {
  return equipo
    .filter(p => p.nombre || p.inicio || p.fin)
    .map(p => {
      const h = horasLogistica(p.inicio, p.fin);
      const imp = importeLogistica(p, tarifa, plusFurgo);
      const horario = p.inicio || p.fin ? ` ${p.inicio || "?"}–${p.fin || "?"}` : "";
      const tipoTxt = p.tipo === "nomina" ? " nómina" : "";
      const detalle = h !== null ? ` (${String(h).replace(".", ",")}h · ${String(imp).replace(".", ",")}€${p.furgoneta ? " con furgo" : ""}${tipoTxt})` : (tipoTxt ? ` (${tipoTxt.trim()})` : "");
      return `${p.nombre || "¿?"}${horario}${detalle}`;
    })
    .join(" · ");
}

// Total en € de todo el equipo de logística (solo personas con horario completo)
export function totalLogistica(equipo = [], tarifa = 0, plusFurgo = 0) {
  return Math.round(equipo.reduce((acc, p) => acc + (importeLogistica(p, tarifa, plusFurgo) || 0), 0) * 100) / 100;
}

// Recogidas: alquileres/equipo de otros proveedores a devolver o recoger en fecha/hora concreta
export function fmtRecogidas(recogidas = []) {
  return recogidas
    .filter(r => r.concepto)
    .map(r => {
      const fechaFmt = r.fecha ? new Date(r.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const cuando = [fechaFmt, r.hora].filter(Boolean).join(" ");
      const devFmt = r.fechaDevolucion ? new Date(r.fechaDevolucion + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const partes = [
        cuando ? `${cuando}${r.recogido ? " ✓" : ""}` : (r.recogido ? "recogido ✓" : ""),
        devFmt ? `devuelve ${devFmt}${r.devuelto ? " ✓" : ""}` : "",
      ].filter(Boolean).join(", ");
      return partes ? `${r.concepto} (${partes})` : r.concepto;
    })
    .join(" · ");
}

// Compras: lo que hay que comprar antes del evento, con su cantidad y cuándo
export function fmtCompras(compras = []) {
  return compras
    .filter(c => c.concepto)
    .map(c => {
      const fechaFmt = c.fecha ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
      const partes = [c.cantidad, fechaFmt, c.comprado ? "✓" : ""].filter(Boolean).join(" ");
      return partes ? `${c.concepto} (${partes})` : c.concepto;
    })
    .join(" · ");
}

// Detecta si un texto pegado usa tabulador (copiado de Excel/Sheets) o coma como separador de columnas
export function detectarDelimitador(text) {
  const primeraLinea = text.split("\n")[0] || "";
  const tabs = (primeraLinea.match(/\t/g) || []).length;
  const comas = (primeraLinea.match(/,/g) || []).length;
  return tabs > comas ? "\t" : ",";
}

// Quita acentos, pasa a minúsculas y limpia puntuación para comparar cabeceras de forma robusta
export function normalizar(s) {
  return s.toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Sugiere a qué categoría de la checklist pertenece un item escrito a mano,
// buscando palabras clave del nombre y emparejándolas con un fragmento del
// nombre real de categoría (que varía según el tipo de evento: "Cocina y fuego",
// "Cocina y Electro", "Cocina y sala"... por eso se busca por fragmento, no por nombre exacto).
const PISTAS_CATEGORIA = [
  { fragmento: "electric", palabras: ["cable", "regleta", "alargador", "enchufe", "foco", "luz", "generador", "electricidad"] },
  { fragmento: "mobiliario", palabras: ["mesa", "silla", "decoracion", "vela", "flor", "centro de mesa", "photocall", "carpa", "taburete", "nevera", "congelador", "lona"] },
  { fragmento: "cocina", palabras: ["horno", "cocina", "sarten", "olla", "fuego", "gas", "plancha", "parrilla", "barbacoa", "paella", "bombona"] },
  { fragmento: "menaje", palabras: ["cuchillo", "cuchara", "tenedor", "utensilio", "bol", "colador", "cucharon"] },
  { fragmento: "cristal", palabras: ["copa", "vaso", "cristal"] },
  { fragmento: "mantel", palabras: ["mantel", "servilleta", "delantal", "textil"] },
  { fragmento: "vajilla", palabras: ["plato", "vajilla", "cubierto"] },
  { fragmento: "limpieza", palabras: ["limpieza", "fairy", "basura", "trapo", "bayeta", "papel"] },
  { fragmento: "cafe", palabras: ["cafe", "te", "infusion", "azucar", "edulcorante"] },
  { fragmento: "bebida", palabras: ["bebida", "agua", "refresco", "cerveza", "vino", "cola", "fanta", "tonica", "zumo", "hielo"] },
  { fragmento: "alcohol", palabras: ["alcohol", "licor", "ron", "vodka", "ginebra", "whisky", "vermut"] },
];

export function sugerirCategoria(label, categoriasDisponibles) {
  const norm = normalizar(label);
  if (!norm) return null;
  for (const pista of PISTAS_CATEGORIA) {
    if (pista.palabras.some(p => norm.includes(p))) {
      const encontrada = categoriasDisponibles.find(c => normalizar(c).includes(pista.fragmento));
      if (encontrada) return encontrada;
    }
  }
  return null;
}

// ─── EXPORTAR A WORD ────────────────────────────────────────────────────────
// Documento HTML que Word abre como si fuera un .doc: todas las categorías con sus
// cantidades, más recogidas/compras y un hueco para notas a mano.
export function generarHTMLWord(evtKey, pax, ninos, horasCoctel, horasCopas, barraCoctel, barraCopas, checklistCompleta, meta = {}) {
  const checklist = quitarItemsSinCantidad(checklistCompleta);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const fechaEventoFmt = meta.fechaEvento ? new Date(meta.fechaEvento + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
  const preparados = meta.preparados || {};
  const checkeados = meta.checkeados || {};
  const vueltos = meta.vueltos || {};
  const roturas = meta.roturas || {};
  const cols = ["Concepto", "Cant.", "Prep. ✓", "Sale ✓", "Vuelve ✓", "Roturas"];
  const tablaHTML = (items, catNombre) => `
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11pt;">
      <thead><tr style="background:#1f314d;color:white;">${cols.map(c => `<th style="text-align:left;padding:6px;">${c}</th>`).join("")}</tr></thead>
      <tbody>${items.map(([label, qty, , labelOriginal, esAlquilerManual, sufijo], i) => {
        const alq = esAlquilerManual || PALABRAS_ALQUILER.some(p => label.toLowerCase().includes(p));
        const key = `${catNombre}::${labelOriginal ?? label}`;
        const prep = preparados[key] ? "✓" : "";
        const sale = checkeados[key] ? "✓" : "";
        const vuelve = vueltos[key] ? "✓" : "";
        const rot = roturas[key] || "";
        return `<tr style="background:${alq ? "#fdf6e3" : i % 2 === 0 ? "#fff" : "#f9fafb"};">
          <td style="padding:5px 6px;">${label}${alq ? ' <b style="color:#b45309;font-size:9pt;">[ALQUILER]</b>' : ""}</td>
          <td style="padding:5px 6px;font-weight:bold;color:#16a34a;">${fmtCantidadCompleta(label, qty.u ? qty.u : qty, sufijo)}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${prep}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${sale}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#16a34a;">${vuelve}</td>
          <td style="width:60px;text-align:center;font-weight:bold;color:#dc2626;">${rot}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  const secciones = checklist.map(cat => `
    <h3 style="background:#1f314d;color:white;padding:8px 12px;font-size:11pt;margin:18px 0 0 0;text-transform:uppercase;">${cat.nombre}</h3>${tablaHTML(cat.items, cat.nombre)}`).join("");
  // Recogidas y compras iban solo en pantalla: en el documento que se lleva la furgoneta
  // no aparecían. Ahora van como secciones propias, con su casilla para marcar en papel.
  const tablaSimple = (titulo, cols, filas) => filas.length === 0 ? "" : `
    <h3 style="background:#1f314d;color:white;padding:8px 12px;font-size:11pt;margin:18px 0 0 0;text-transform:uppercase;">${titulo}</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:11pt;">
      <thead><tr style="background:#1f314d;color:white;">${cols.map(c => `<th style="text-align:left;padding:6px;">${c}</th>`).join("")}</tr></thead>
      <tbody>${filas.map((f, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">${f.map((celda, j) => `<td style="padding:5px 6px;${j === f.length - 1 ? "width:60px;text-align:center;font-weight:bold;color:#16a34a;" : ""}">${celda}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  const fmtFecha = (f) => f ? new Date(f + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
  const seccionRecogidas = tablaSimple("Recogidas y devoluciones", ["Concepto", "Recoger", "Devolver", "Hecho"],
    (meta.recogidas || []).filter(r => r.concepto).map(r => [
      r.concepto,
      [fmtFecha(r.fecha), r.hora].filter(Boolean).join(" ") || "—",
      fmtFecha(r.fechaDevolucion) || "—",
      r.recogido || r.devuelto ? "✓" : "",
    ]));
  const seccionCompras = tablaSimple("Compras", ["Concepto", "Cantidad", "Cuándo", "Hecho"],
    (meta.compras || []).filter(c => c.concepto).map(c => [
      c.concepto, c.cantidad || "—", fmtFecha(c.fecha) || "—", c.comprado ? "✓" : "",
    ]));
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Checklist ${EVENTOS[evtKey]?.label} · ${pax} pax</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#222;}h1{color:#1f314d;font-size:18pt;}
    .meta{display:flex;flex-wrap:wrap;gap:12px 32px;background:#f3f4f6;padding:12px 16px;border-radius:4px;margin:16px 0;font-size:10pt;}
    .ml{font-weight:bold;color:#555;font-size:9pt;text-transform:uppercase;display:block;}
    .notas{margin-top:24px;border:1px solid #ddd;padding:12px;min-height:80px;border-radius:4px;}
    @media print{body{margin:10px}}</style>
    </head><body>
    <h1>${meta.nombreEvento ? meta.nombreEvento.toUpperCase() : `CHECKLIST DE EVENTO — ${EVENTOS[evtKey]?.label?.toUpperCase()}`} · ${pax} PAX</h1>
    <div class="meta">
      ${meta.nombreEvento ? `<div><span class="ml">Tipo de evento</span>${EVENTOS[evtKey]?.label}</div>` : ""}
      ${fechaEventoFmt ? `<div><span class="ml">Fecha del evento</span>${fechaEventoFmt}</div>` : ""}
      ${meta.horaInicio ? `<div><span class="ml">Hora de inicio</span>${meta.horaInicio}h</div>` : ""}
      ${meta.ubicacion ? `<div><span class="ml">Ubicación</span>${meta.ubicacion}</div>` : ""}
      ${fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) ? `<div><span class="ml">Equipo logística</span>${fmtLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)}${totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta) > 0 ? ` — Total ${String(totalLogistica(meta.logisticaEquipo, meta.tarifaLogistica, meta.plusFurgoneta)).replace(".", ",")}€` : ""}</div>` : ""}
      ${fmtRecogidas(meta.recogidas) ? `<div><span class="ml">Recogidas</span>${fmtRecogidas(meta.recogidas)}</div>` : ""}
      <div><span class="ml">Fecha generación</span>${fecha}</div>
      <div><span class="ml">PAX total</span>${(() => {
        const dias = evtKey === "produccion" ? (meta.diasProduccion || []).map(d => parseInt(d, 10)).filter(n => n > 0) : [];
        return dias.length ? `${dias.join(" + ")} pax (${dias.length} días de producción)` : `${pax + ninos} (${pax} adultos${ninos > 0 ? ` + ${ninos} niños` : ""})`;
      })()}</div>
      ${evtKey !== "produccion" ? `<div><span class="ml">Barra libre</span>${barraCoctel ? `Cóctel ${horasCoctel}h` : "—"}${barraCopas ? ` + Copas ${horasCopas}h` : ""}</div>` : ""}
    </div>
    ${secciones}
    ${seccionRecogidas}
    ${seccionCompras}
    <div class="notas"><strong>NOTAS:</strong><br/>${meta.notasEvento ? `<p style="white-space:pre-wrap;margin:6px 0;">${meta.notasEvento}</p>` : "<br/>"}</div>
    </body></html>`;
}
